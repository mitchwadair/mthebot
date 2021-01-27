// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../../utils');
const DBService = require('../../dbservice');

const schema = {
    enabled: 'boolean',
    message: 'string'
}

const get = (req, res) => {
    const channel = req.params.channel;
    const evt = req.params.name;
    if (evt) {
        DBService.getEventForChannel(evt, channel).then(data => {
            if (data)
                res.status(200).json(data);
            else
                res.status(404).send(`Event ${encodeURIComponent(evt)} not found for channel ${encodeURIComponent(channel)}`);
        }).catch(err => {
            res.status(500).send(encodeURIComponent(err.toString()));
        });
    } else {
        DBService.getAllEventsForChannel(channel).then(data => {
            res.status(200).json(data);
        }).catch(err => {
            res.status(500).send(encodeURIComponent(err.toString()));
        });
    }
}

const put = (actions, req, res) => {
    const channel = req.params.channel;
    const evt = req.params.name;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    DBService.updateEventForChannel(evt, body, channel).then(data => {
        if (data) {
            actions.refreshChannelData(channel);
            res.status(200).json(data);
        } else
            res.status(404).send(`Event ${encodeURIComponent(evt)} not found for channel ${encodeURIComponent(channel)}`);
    }).catch(err => {
        res.status(500).send(encodeURIComponent(err.toString()));
    });
}

module.exports = {
    get,
    put
}