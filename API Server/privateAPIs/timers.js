// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const { validateData } = require("../../utils");
const DBService = require("../../dbservice");

const schema = {
    name: "string",
    enabled: "boolean",
    message: "string",
    interval: "number",
    message_threshold: "number",
};

const get = async (req, res) => {
    const { channel, name: timer } = req.params;
    try {
        if (timer) {
            const data = await DBService.getTimerForChannel(timer, channel);
            if (data) {
                res.status(200).json(data);
            } else {
                res.status(404).send(
                    `Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`
                );
            }
        } else {
            const data = await DBService.getAllTimersForChannel(channel);
            res.status(200).json(data);
        }
    } catch (err) {
        res.status(500).send(encodeURIComponent(err.toString()));
    }
};

const post = async (actions, req, res) => {
    const { params, body } = req;
    const channel = params.channel;

    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400);
        res.json(validated);
        return;
    }

    try {
        const data = await DBService.addTimerForChannel(body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else {
            res.status(400).send(
                `Timer ${encodeURIComponent(body.name)} already exists for channel ${encodeURIComponent(channel)}`
            );
        }
    } catch (err) {
        res.status(500).send(encodeURIComponent(err.toString()));
    }
};

const put = async (actions, req, res) => {
    const {
        params: { channel, name: timer },
        body,
    } = req;

    const validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }

    try {
        const data = await DBService.updateTimerForChannel(timer, body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else {
            res.status(404).send(
                `Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`
            );
        }
    } catch (err) {
        res.status(500).send(encodeURIComponent(err.toString()));
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
            res.status(404).send(
                `Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`
            );
        }
    } catch (err) {
        res.status(500).send(encodeURIComponent(err.toString()));
    }
};

module.exports = {
    get,
    post,
    put,
    remove,
};
