// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../../utils');
const DBService = require('../../dbservice');

const schema = {
    name: 'string',
    enabled: 'boolean',
    message: 'string',
    interval: 'number',
    message_threshold: 'number'
}

const get = (req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    if (timer) {
        DBService.getTimerForChannel(timer, channel).then(data => {
            if (data)
                res.status(200).json(data);
            else
                res.status(404).send(`Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    } else {
        DBService.getAllTimersForChannel(channel).then(data => {
            res.status(200).json(data);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    }
}

const post = (actions, req, res) => {
    const channel = req.params.channel;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400);
        res.json(validated);
        return;
    }
    DBService.addTimerForChannel(body, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else
            res.status(400).send(`Timer ${encodeURIComponent(body.name)} already exists for channel ${encodeURIComponent(channel)}`);
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

const put = (actions, req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    DBService.updateTimerForChannel(timer, body, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else
            res.status(404).send(`Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`);
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

const remove = (actions, req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    DBService.deleteTimerForChannel(timer, channel).then(removed => {
        if (removed) {
            actions.refreshChannelData(channel);
            res.status(200).send();
        } else
            res.status(404).send(`Timer ${encodeURIComponent(timer)} not found for channel ${encodeURIComponent(channel)}`);
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

module.exports = {
    get,
    post,
    put,
    remove
}