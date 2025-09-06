// Copyright (c) 2020-2025 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const express = require("express");
const { param, validationResult } = require("express-validator");

const users = require("./publicAPIs/users");
const commands = require("./privateAPIs/commands");
const timers = require("./privateAPIs/timers");
const events = require("./privateAPIs/events");
const chats = require("./privateAPIs/chats");
const auth = require("./publicAPIs/auth");

const DBService = require("../dbservice");
const { timedLog } = require("../utils");

module.exports = function (actions) {
    const server = express();
    const port = process.env.PORT || 8080;

    let sessionPool = {};

    // Authentication middleware for Express
    const requireAuth = (req, res, next) => {
        //let all requests through in dev mode
        if (process.env.NODE_ENV === "development") {
            return next();
        }

        const session = req.headers.authorization.replace("Bearer ", "");
        const channel = req.params.channel;

        // manage the session pool
        // if the user has an active session, let the request through
        if (sessionPool[session]) {
            if (sessionPool[session].channel_id !== channel) {
                res.status(401).send("Unauthorized request to private API");
            }
            return next();
        } else {
            if (req.headers.authorization) {
                res.status(401).send("Session expired");
            } else {
                res.status(401).send("Unauthorized request to private API");
            }
        }
    };

    const handleValidationResult = (req, res, next) => {
        const result = validationResult(req).formatWith(
            ({ location, param, msg, value }) => `${location}[${param}]: ${msg} "${value}"`
        );
        if (!result.isEmpty()) {
            res.status(400).json({ errors: result.array() });
            return true;
        }
        next();
    };

    server.use(express.json());

    server.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

        if (req.method === "OPTIONS") {
            return res.status(200).send();
        }

        next();
    });

    // check if channel exists for all routes with channel param
    server.param("channel", async (req, res, next, id) => {
        try {
            // hacky way to validate "channel" param in this middleware using express-validator
            param("channel").isNumeric()(req, res, () => {});
            const validationError = handleValidationResult(req, res, () => {});
            if (validationError) return;

            const channel = await DBService.getChannel(id);
            if (channel) {
                next();
            } else {
                res.status(404).send(`Channel ${id} not found`);
            }
        } catch (err) {
            res.status(500).send(err.message);
        }
    });

    // ==== PRIVATE APIS ====

    // COMMANDS API Routes
    const { params: commandParamValidators, schema: commandSchemaValidators } = commands.validators;
    server
        .route("/commands/:channel/:alias?")
        .all(requireAuth)
        .get(commandParamValidators, handleValidationResult, commands.get)
        .post(commandSchemaValidators, handleValidationResult, (req, res) => {
            commands.post(actions, req, res);
        })
        .put(commandParamValidators, commandSchemaValidators, handleValidationResult, (req, res) => {
            commands.put(actions, req, res);
        })
        .delete(commandParamValidators, handleValidationResult, (req, res) => {
            commands.remove(actions, req, res);
        });

    // EVENTS API ROUTES
    const { params: eventParamValidators, schema: eventSchemaValidators } = events.validators;
    server
        .route("/events/:channel/:name?")
        .all(requireAuth)
        .get(eventParamValidators, handleValidationResult, events.get)
        .put(eventParamValidators, eventSchemaValidators, handleValidationResult, (req, res) => {
            events.put(actions, req, res);
        });

    // TIMERS API ROUTES
    const { params: timerParamValidators, schema: timerSchemaValidators } = timers.validators;
    server
        .route("/timers/:channel/:name?")
        .all(requireAuth)
        .get(timerParamValidators, handleValidationResult, timers.get)
        .post(timerSchemaValidators, handleValidationResult, (req, res) => {
            timers.post(actions, req, res);
        })
        .put(timerParamValidators, timerSchemaValidators, handleValidationResult, (req, res) => {
            timers.put(actions, req, res);
        })
        .delete(timerParamValidators, handleValidationResult, (req, res) => {
            timers.remove(actions, req, res);
        });

    // CHATS API ROUTES
    server
        .route("/chats/:channel")
        .all(requireAuth)
        .get(chats.get)
        .post((req, res) => {
            chats.post(actions, req, res);
        })
        .delete((req, res) => {
            chats.remove(actions, req, res);
        });

    // ==== PUBLIC APIS ====

    // AUTH API ROUTES
    server.route("/auth").post((req, res) => {
        auth.post(actions, sessionPool, req, res);
    });

    // USERS API ROUTES
    server.route("/users").get(users.get);

    server.listen(port, () => {
        timedLog(`API Server listening on port ${port}`);
    });
    return server;
};
