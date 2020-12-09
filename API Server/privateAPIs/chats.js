// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require('../../dbservice');

const get = (req, res) => {
    const channel = req.params.channel;
    DBService.getChannel(channel).then(data => {
        if (data)
            res.status(200).send(data.enabled.toString());
        else 
            res.status(404).send(`Channel ${encodeURIComponent(channel)} not found`);
    }).catch(err => {
        res.status(500).send(encodeURIComponent(err.toString()));
    });
}

const post = (actions, req, res) => {
    const channel = req.params.channel;
    DBService.enableChannel(channel).then(_ => {
        actions.joinChannel(channel).then(_ => {
            res.status(200).send(`Bot set to enabled for channel ${encodeURIComponent(channel)}`);
        }).catch(err => {
            res.status(500).send(encodeURIComponent(err.toString()));
        });
    }).catch(err => {
        res.status(500).send(encodeURIComponent(err.toString()));
    });
}

const remove = (actions, req, res) => {
    const channel = req.params.channel
    DBService.disableChannel(channel).then(_ => {
        actions.leaveChannel(channel).then(_ => {
            res.status(200).send(`Bot set to disabled for channel ${encodeURIComponent(channel)}`);
        }).catch(err => {
            res.status(500).send(encodeURIComponent(err.toString()));
        });
    }).catch(err => {
        res.status(500).send(encodeURIComponent(err.toString()));
    });
}

module.exports = {
    get,
    post,
    remove
}