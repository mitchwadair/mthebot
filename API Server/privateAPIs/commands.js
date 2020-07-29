// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {getArgsFromURL, channelExistsInDB, validateData} = require('../utils');

const schema = {
    alias: 'string',
    message: 'string',
    cooldown: 'number',
    user_level: 'number'
}

const get = (db, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const cmd = args[1];
    channelExistsInDB(db, channel).then(_ => {
        if (cmd) {
            db.query(`SELECT * FROM commands WHERE channel_id=? and alias=?`, [channel, cmd], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                } else if (!results.length) {
                    res.writeHead(404);
                    res.end(`Command ${cmd} not found for channel ${channel}`);
                    return;
                }
                const responseBody = {
                    alias: results[0].alias,
                    message: results[0].message,
                    cooldown: results[0].cooldown,
                    user_level: results[0].user_level,
                }
                res.writeHead(200);
                res.end(JSON.stringify(responseBody));
            });
        } else {
            db.query(`SELECT * FROM commands WHERE channel_id=?`, [channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
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
                res.writeHead(200);
                res.end(JSON.stringify(responseBody));
            });
        }
    }).catch(err => {
        res.writeHead(404);
        res.end(`Channel ${channel} not found`);
    });
}

const post = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    let body = [];
    channelExistsInDB(db, channel).then(_ => {
        req.on('error', err => {
            res.writeHead(500);
            res.end(err);
        }).on('data', chunk => {
            body.push(chunk);
        }).on('end', _ => {
            body = JSON.parse(Buffer.concat(body).toString());
            let validated = validateData(schema, body);
            if (validated !== true) {
                res.writeHead(400);
                res.end(JSON.stringify(validated));
                return;
            }
            db.query(`SELECT * FROM commands WHERE channel_id=? and alias=?`, [channel, body.alias], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                } else if (results.length) {
                    res.writeHead(401);
                    res.end(`Command ${body.alias} already exists for channel ${channel}`);
                    return;
                }
                db.query(
                `INSERT INTO commands (channel_id, alias, message, cooldown, user_level) VALUES (?, ?, ?, ?, ?)`,
                [channel, body.alias, body.message, body.cooldown, body.user_level],
                err => {
                    if (err) {
                        res.writeHead(500);
                        res.end(err);
                        return;
                    }
                    actions.refreshChannelData(channel);
                    res.writeHead(200);
                    res.end(JSON.stringify(body));
                });
            });
        });
    }).catch(err => {
        res.writeHead(404);
        res.end(`Channel ${channel} not found`);
    });
}

const put = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const cmd = args[1];
    let body = [];
    channelExistsInDB(db, channel).then(_ => {
        req.on('error', err => {
            res.writeHead(500);
            res.end(err);
        }).on('data', chunk => {
            body.push(chunk);
        }).on('end', _ => {
            body = JSON.parse(Buffer.concat(body).toString());
            let validated = validateData(schema, body);
            if (validated !== true) {
                res.writeHead(400);
                res.end(JSON.stringify(validated));
                return;
            }
            db.query(
            `UPDATE commands SET alias=?, message=?, cooldown=?, user_level=? where channel_id=? and alias=?`,
            [body.alias, body.message, body.cooldown, body.user_level, channel, cmd],
            (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                }else if (!results.affectedRows) { 
                    res.writeHead(404);
                    res.end(`Command ${cmd} not found for channel ${channel}`);
                    return;
                }
                actions.refreshChannelData(channel);
                res.writeHead(200);
                res.end(JSON.stringify(body));
            });
        });
    }).catch(err => {
        res.writeHead(404);
        res.end(`Channel ${channel} not found`);
    });
}

const remove = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const cmd = args[1];
    channelExistsInDB(db, channel).then(_ => {
        db.query(`DELETE FROM commands where channel_id=? and alias=?`, [channel, cmd], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(err);
                return;
            }else if (!results.affectedRows) { 
                res.writeHead(404);
                res.end(`Command ${cmd} not found for channel ${channel}`);
                return;
            }
            actions.refreshChannelData(channel);
            res.writeHead(200);
            res.end();
        });
    }).catch(err => {
        res.writeHead(404);
        res.end(`Channel ${channel} not found`);
    });
}

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'GET':
            get(db, req, res);
            break;
        case 'POST':
            post(db, actions, req, res);
            break;
        case 'PUT':
            put(db, actions, req, res);
            break;
        case 'DELETE':
            remove(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}