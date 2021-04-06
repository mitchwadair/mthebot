// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const express = require('express');
const users = require('./publicAPIs/users');
const commands = require('./privateAPIs/commands');
const timers = require('./privateAPIs/timers');
const events = require('./privateAPIs/events');
const chats = require('./privateAPIs/chats');
const contact = require('./publicAPIs/contact');
const auth = require('./publicAPIs/auth');

const DBService = require('../dbservice');
const {timedLog} = require('../utils');

module.exports = function(actions) {
    const server = express();
    const port = process.env.PORT || 8080;

    let sessionPool = {};

    // Authentication middleware for Express
    const requireAuth = (req, res, next) => {
        //let all requests through in dev mode
        if (process.env.NODE_ENV === 'development') {
            return next();
        }

        const session = req.headers.authorization.replace('Bearer ', '');
        const channel = req.params.channel;

        // manage the session pool
        // if the user has an active session, let the request through
        if (sessionPool[session]) {
            if (sessionPool[session].channel_id !== channel) {
                res.status(401).send('Unauthorized request to private API');
            }
            return next();
        } else {
            if (req.headers.authorization) {
                res.status(401).send('Session expired');
            } else {
                res.status(401).send('Unauthorized request to private API');
            }
        }
    }
    
    server.use(express.json());

    server.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

        if (req.method === 'OPTIONS') {
            return res.status(200).send();
        }

        next();
    });

    // check if channel exists for all routes with channel param
    server.param('channel', (req, res, next, id) => {
        DBService.getChannel(id).then(channel => {
            if (channel) {
                return next();
            } else {
                res.status(404).send(`Channel ${encodeURIComponent(id)} not found`);
            }
        }).catch(err => {
            res.status(500).send(encodeURIComponent(err.toString()));
        });
    });

    // ==== PRIVATE APIS ====

    // COMMANDS API Routes
    server.route('/commands/:channel/:alias?')
        .all(requireAuth)
        .get(commands.get)
        .post((req, res) => {commands.post(actions, req, res)})
        .put((req, res) => {commands.put(actions, req, res)})
        .delete((req, res) => {commands.remove(actions, req, res)});

    // EVENTS API ROUTES
    server.route('/events/:channel/:name?')
        .all(requireAuth)
        .get(events.get)
        .put((req, res) => {events.put(actions, req, res)});

    // TIMERS API ROUTES
    server.route('/timers/:channel/:name?')
        .all(requireAuth)
        .get(timers.get)
        .post((req, res) => {timers.post(actions, req, res)})
        .put((req, res) => {timers.put(actions, req, res)})
        .delete((req, res) => {timers.remove(actions, req, res)});

    // CHATS API ROUTES
    server.route('/chats/:channel')
        .all(requireAuth)
        .get(chats.get)
        .post((req, res) => {chats.post(actions, req, res)})
        .delete((req, res) => {chats.remove(actions, req, res)});    

    // ==== PUBLIC APIS ====

    // AUTH API ROUTES
    server.route('/auth')
        .post((req, res) => {auth.post(actions, sessionPool, req, res)});

    // CONTACT API ROUTES
    server.route('/contact')
        .post(contact.post);

    // USERS API ROUTES
    server.route('/users')
        .get(users.get);

    server.listen(port, _ => {timedLog(`** API Server listening on port ${port}`)});
    return server;
}