// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {validateData} = require('../utils');

const schema = {
    alias: 'string',
    message: 'string',
    cooldown: 'number',
    user_level: 'number'
}

const get = (db, req, res) => {
    const channel = req.params.channel;
    const cmd = req.params.alias;
    if (cmd) {
        db.query(`SELECT * FROM commands WHERE channel_id=? and alias=?`, [channel, cmd], (err, results) => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            } else if (!results.length) {
                res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
                return;
            }
            const responseBody = {
                alias: results[0].alias,
                message: results[0].message,
                cooldown: results[0].cooldown,
                user_level: results[0].user_level,
            }
            res.status(200).json(responseBody);
        });
    } else {
        db.query(`SELECT * FROM commands WHERE channel_id=?`, [channel], (err, results) => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            }
            const responseBody = results.map(c => {
                return {
                    alias: c.alias,
                    message: c.message,
                    cooldown: c.cooldown,
                    user_level: c.user_level,
                }
            });
            res.status(200).json(responseBody);
        });
    }
}

const post = (db, actions, req, res) => {
    const channel = req.params.channel;
    const body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    db.query(`SELECT * FROM commands WHERE channel_id=? and alias=?`, [channel, body.alias], (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        } else if (results.length) {
            res.status(400).send(`Command ${body.alias} already exists for channel ${channel}`);
            return;
        }
        db.query(
        `INSERT INTO commands (channel_id, alias, message, cooldown, user_level) VALUES (?, ?, ?, ?, ?)`,
        [channel, body.alias, body.message, body.cooldown, body.user_level],
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
    const cmd = req.params.alias;
    let body = req.body;
    let validated = validateData(schema, body);
    if (validated !== true) {
        res.status(400).json(validated);
        return;
    }
    db.query(
    `UPDATE commands SET alias=?, message=?, cooldown=?, user_level=? where channel_id=? and alias=?`,
    [body.alias, body.message, body.cooldown, body.user_level, channel, cmd],
    (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }else if (!results.affectedRows) { 
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
            return;
        }
        actions.refreshChannelData(channel);
        res.status(200).json(body);
    });
}

const remove = (db, actions, req, res) => {
    const channel = req.params.channel;
    const cmd = req.params.alias;
    db.query(`DELETE FROM commands where channel_id=? and alias=?`, [channel, cmd], (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }else if (!results.affectedRows) { 
            res.status(404).send(`Command ${cmd} not found for channel ${channel}`);
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