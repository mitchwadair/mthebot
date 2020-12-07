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
const init = require('./privateAPIs/init');
const contact = require('./publicAPIs/contact');
const auth = require('./publicAPIs/auth');

const {channelExistsInDB, httpsRequest} = require('../utils');

const timedLog = message => {
    console.log(`${new Date(Date.now()).toUTCString()} ${message}`);
}

module.exports = function(db, actions) {
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
            if (sessionPool[session].channel !== channel) {
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

    // use express.json for body parsing
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
        const route = req.route.path.split('/')[1];
        if (route === 'init') {
            return next();
        } else {
            channelExistsInDB(db, id).then(_ => {
                return next();
            }).catch(err => {
                res.status(404);
                return res.send(`Channel ${id} not found`);
            });
        }
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
        .get((req, res) => {timers.get(db, req, res)})
        .post((req, res) => {timers.post(db, actions, req, res)})
        .put((req, res) => {timers.put(db, actions, req, res)})
        .delete((req, res) => {timers.remove(db, actions, req, res)});

    // CHATS API ROUTES
    server.route('/chats/:channel')
        .all(requireAuth)
        .get(chats.get)
        .post((req, res) => {chats.post(actions, req, res)})
        .delete((req, res) => {chats.remove(actions, req, res)});    

    // INIT API ROUTES
    server.route('/init/:channel')
        .all(requireAuth)
        .post((req, res) => {init.post(db, actions, req, res)});

    // ==== PUBLIC APIS ====

    // AUTH API ROUTES
    server.route('/auth')
        .post((req, res) => {auth.post(db, actions, sessionPool, req, res)});

    // CONTACT API ROUTES
    server.route('/contact')
        .post(contact.post);

    // USERS API ROUTES
    server.route('/users')
        .get((req, res) => {users.get(db, req, res)});

    server.listen(port, _ => {timedLog(`** API Server listening on port ${port}`)});
    return server;
}