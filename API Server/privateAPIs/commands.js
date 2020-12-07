// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../../utils');
const DBService = require('../../dbservice');

const schema = {
    alias: 'string',
    message: 'string',
    cooldown: 'number',
    user_level: 'number'
}

const get = (req, res) => {
    const channel = req.params.channel;
    const cmd = req.params.alias;
    if (cmd) {
        DBService.getCommandForChannel(cmd, channel).then(data => {
            if (data)
                res.status(200).json(data);
            else
                res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    } else {
        DBService.getAllCommandsForChannel(channel).then(data => {
            res.status(200).json(data);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    }
}

const post = (actions, req, res) => {
    const channel = req.params.channel;
    const body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    DBService.addCommandForChannel(body, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(body);
        } else {
            res.status(400).send(`Command ${body.alias} already exists for channel ${channel}`);
        }
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

const put = (actions, req, res) => {
    const channel = req.params.channel;
    const cmd = req.params.alias;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    DBService.updateCommandForChannel(cmd, body, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(body);
        } else 
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

const remove = (actions, req, res) => {
    const channel = req.params.channel;
    const cmd = req.params.alias;
    DBService.deleteCommandForChannel(cmd, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).send();
        } else
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
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