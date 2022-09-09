// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require("../../dbservice");
const { body, param } = require("express-validator");

const validators = {
    params: [param("name").optional().isString()],
    schema: [
        body("name").isString(),
        body("enabled").isBoolean(),
        body("message").isString(),
        body("interval").isNumeric(),
        body("message_threshold").isNumeric(),
    ],
};

const get = async (req, res) => {
    const { channel, name: timer } = req.params;
    try {
        if (timer) {
            const data = await DBService.getTimerForChannel(timer, channel);
            if (data) {
                res.status(200).json(data);
            } else {
                res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
            }
        } else {
            const data = await DBService.getAllTimersForChannel(channel);
            res.status(200).json(data);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const post = async (actions, req, res) => {
    const { params, body } = req;
    const channel = params.channel;
    try {
        const data = await DBService.addTimerForChannel(body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else {
            res.status(400).send(`Timer ${body.name} already exists for channel ${channel}`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const put = async (actions, req, res) => {
    const {
        params: { channel, name: timer },
        body,
    } = req;
    try {
        const data = await DBService.updateTimerForChannel(timer, body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else {
            res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const remove = async (actions, req, res) => {
    const { channel, name: timer } = req.params;
    try {
        const removed = await DBService.deleteTimerForChannel(timer, channel);
        if (removed) {
            actions.refreshChannelData(channel);
            res.status(200).send();
        } else {
            res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

module.exports = {
    get,
    post,
    put,
    remove,
    validators,
};
