// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../../utils');

const schema = {
    name: 'string',
    enabled: 'boolean',
    message: 'string',
    interval: 'number',
    message_threshold: 'number'
}

const get = (db, req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    if (timer) {
        db.query(`SELECT * FROM timers WHERE channel_id=? and name=?`, [channel, timer], (err, results) => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            } else if (!results.length) {
                res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
                return;
            }
            const responseBody = {
                name: results[0].name,
                message: results[0].message,
                enabled: results[0].enabled ? true : false,
                interval: results[0].interval,
                message_threshold: results[0].message_threshold
            }
            res.status(200).json(responseBody);
        });
    } else {
        db.query(`SELECT * FROM timers WHERE channel_id=?`, [channel], (err, results) => {
            if (err) {
                res.status(500);
                res.send(err.toString());
                return;
            }
            const responseBody = results.map(c => {
                return {
                    name: c.name,
                    message: c.message,
                    enabled: c.enabled ? true : false,
                    interval: c.interval,
                    message_threshold: c.message_threshold
                }
            });
            res.status(200).json(responseBody);
        });
    }
}

const post = (db, actions, req, res) => {
    const channel = req.params.channel;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400);
        res.json(validated);
        return;
    }
    db.query(`SELECT * FROM timers WHERE channel_id=? and name=?`, [channel, body.name], (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        } else if (results.length) {
            res.status(400).send(`Timer ${body.name} already exists for channel ${channel}`);
            return;
        }
        db.query(
        `INSERT INTO timers (channel_id, name, enabled, message, \`interval\`, message_threshold) VALUES (?, ?, ?, ?, ?, ?)`,
        [channel, body.name, body.enabled, body.message, body.interval, body.message_threshold],
        err => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            }
            actions.refreshChannelData(channel);
            res.status(200).json(body);
        });
    });
}

const put = (db, actions, req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    db.query(
    `UPDATE timers SET name=?, enabled=?, message=?, \`interval\`=?, message_threshold=? where channel_id=? and name=?`,
    [body.name, body.enabled, body.message, body.interval, body.message_threshold, channel, timer],
    (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }else if (!results.affectedRows) { 
            res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
            return;
        }
        actions.refreshChannelData(channel);
        res.status(200).json(body);
    });
}

const remove = (db, actions, req, res) => {
    const channel = req.params.channel;
    const timer = req.params.name;
    db.query(`DELETE FROM timers where channel_id=? and name=?`, [channel, timer], (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }else if (!results.affectedRows) { 
            res.status(404).send(`Timer ${timer} not found for channel ${channel}`);
            return;
        }
        actions.refreshChannelData(channel);
        res.status(200).send();
    });
}

module.exports = {
    get,
    post,
    put,
    remove
}