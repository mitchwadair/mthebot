// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require("../../dbservice");
const { body, param } = require("express-validator");

const validators = {
    params: [param("alias").optional().isString()],
    schema: [body("message").isString(), body("cooldown").isNumeric(), body("user_level").isNumeric()],
};

const get = async (req, res) => {
    const { channel, alias: cmd } = req.params;
    try {
        if (cmd) {
            const data = await DBService.getCommandForChannel(cmd, channel);
            if (data) {
                res.status(200).json(data);
            } else {
                res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
            }
        } else {
            const data = await DBService.getAllCommandsForChannel(channel);
            res.status(200).json(data);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const post = async (actions, req, res) => {
    const {
        params: { channel },
        body,
    } = req;
    try {
        const data = await DBService.addCommandForChannel(body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(body);
        } else {
            res.status(400).send(`Command ${body.alias} already exists for channel ${channel}`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const put = async (actions, req, res) => {
    const {
        params: { channel, alias: cmd },
        body,
    } = req;
    try {
        const data = await DBService.updateCommandForChannel(cmd, body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(body);
        } else {
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const remove = async (actions, req, res) => {
    const { channel, alias: cmd } = req.params;
    try {
        const data = await DBService.deleteCommandForChannel(cmd, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).send();
        } else {
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
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
