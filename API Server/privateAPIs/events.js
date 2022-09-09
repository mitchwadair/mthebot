// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require("../../dbservice");
const { body, param } = require("express-validator");

const validators = {
    params: [param("name").optional().isString()],
    schema: [body("enabled").isBoolean(), body("message").isString()],
};

const get = async (req, res) => {
    const { channel, name: evt } = req.params;
    try {
        let data;
        if (evt) {
            data = await DBService.getEventForChannel(evt, channel);
            if (data) {
                res.status(200).json(data);
            } else {
                res.status(404).send(`Event ${evt} not found for channel ${channel}`);
            }
        } else {
            data = await DBService.getAllEventsForChannel(channel);
            res.status(200).json(data);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const put = async (actions, req, res) => {
    const {
        params: { channel, name: evt },
        body,
    } = req;

    const updateEvent = async () => {
        const data = await DBService.updateEventForChannel(evt, body, channel);
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else {
            res.status(404).send(`Event ${evt} not found for channel ${channel}`);
        }
    };

    try {
        if (evt === "follow") {
            const data = await DBService.getEventForChannel(evt, channel);
            if (data.enabled !== body.enabled) {
                if (body.enabled) {
                    await actions.subscribeFollow(channel);
                } else {
                    await actions.unsubscribeFollow(channel);
                }
            }
        }
        await updateEvent();
    } catch (err) {
        res.status(500).send(err.message);
    }
};

module.exports = {
    get,
    put,
    validators,
};
