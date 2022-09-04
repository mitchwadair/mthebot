// Copyright (c) 2020-2022 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require("../../dbservice");
const { setModeratorStatus } = require("../../External Data APIs/twitch");

const get = async (req, res) => {
    const { channel } = req.params;
    try {
        const data = await DBService.getChannel(channel);
        if (data) {
            res.status(200).send(data.enabled.toString());
        } else {
            res.status(404).send(`Channel ${channel} not found`);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const post = async (actions, req, res) => {
    const { channel } = req.params;
    try {
        await DBService.enableChannel(channel);
        await actions.joinChannel(channel);
        await setModeratorStatus(channel, true);
        res.status(200).send(`Bot set to enabled for channel ${channel}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

const remove = async (actions, req, res) => {
    const { channel } = req.params;
    try {
        await DBService.disableChannel(channel);
        await actions.leaveChannel(channel);
        await setModeratorStatus(channel, false);
        res.status(200).send(`Bot set to disabled for channel ${channel}`);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

module.exports = {
    get,
    post,
    remove,
};
