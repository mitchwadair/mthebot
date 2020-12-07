// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../utils');

const schema = {
    enabled: 'boolean',
    message: 'string'
}

const get = (db, req, res) => {
    const channel = req.params.channel;
    const evt = req.params.name;
    if (evt) {
        db.query(`SELECT * FROM events WHERE channel_id=? and name=?`, [channel, evt], (err, results) => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            } else if (!results.length) {
                res.status(404).send(`Event ${evt} not found for channel ${channel}`);
                return;
            }
            const responseBody = {
                name: results[0].name,
                message: results[0].message,
                enabled: results[0].enabled ? true : false,
            }
            res.status(200).json(responseBody);
        });
    } else {
        db.query(`SELECT * FROM events WHERE channel_id=?`, [channel], (err, results) => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            }
            const responseBody = results.map(c => {
                return {
                    name: c.name,
                    message: c.message,
                    enabled: c.enabled ? true : false
                }
            });
            res.status(200).json(responseBody);
        });
    }
}

const put = (db, actions, req, res) => {
    const channel = req.params.channel;
    const evt = req.params.name;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    db.query(
    `UPDATE events SET name=?, message=?, enabled=? where channel_id=? and name=?`,
    [evt, body.message, body.enabled, channel, evt],
    (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }else if (!results.affectedRows) { 
            res.status(404).send(`Event ${evt} not found for channel ${channel}`);
            return;
        }
        actions.refreshChannelData(channel);
        res.status(200).json(body);
    });
}

module.exports = {
    get,
    put
}