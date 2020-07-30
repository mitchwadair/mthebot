// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {getArgsFromURL, channelExistsInDB, validateData} = require('../utils');

const schema = {
    name: 'string',
    enabled: 'boolean',
    message: 'string',
    interval: 'number',
    message_threshold: 'number'
}

const get = (db, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const timer = args[1];
    channelExistsInDB(db, channel).then(_ => {
        if (timer) {
            db.query(`SELECT * FROM timers WHERE channel_id=? and name=?`, [channel, timer], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err.toString());
                    return;
                } else if (!results.length) {
                    res.writeHead(404);
                    res.end(`Timer ${timer} not found for channel ${channel}`);
                    return;
                }
                const responseBody = {
                    name: results[0].name,
                    message: results[0].message,
                    enabled: results[0].enabled ? true : false,
                    interval: results[0].interval,
                    message_threshold: results[0].message_threshold
                }
                res.writeHead(200);
                res.end(JSON.stringify(responseBody));
            });
        } else {
            db.query(`SELECT * FROM timers WHERE channel_id=?`, [channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err.toString());
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
            res.end(`ERROR: ${err}`);
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
            db.query(`SELECT * FROM timers WHERE channel_id=? and name=?`, [channel, body.name], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err.toString());
                    return;
                } else if (results.length) {
                    res.writeHead(400);
                    res.end(`Timer ${body.name} already exists for channel ${channel}`);
                    return;
                }
                db.query(
                `INSERT INTO timers (channel_id, name, enabled, message, \`interval\`, message_threshold) VALUES (?, ?, ?, ?, ?, ?)`,
                [channel, body.name, body.enabled, body.message, body.interval, body.message_threshold],
                err => {
                    if (err) {
                        res.writeHead(500);
                        res.end(err.toString());
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
    const timer = args[1];
    let body = [];
    channelExistsInDB(db, channel).then(_ => {
        req.on('error', err => {
            res.writeHead(500);
            res.end(err.toString());
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
            `UPDATE timers SET name=?, enabled=?, message=?, \`interval\`=?, message_threshold=? where channel_id=? and name=?`,
            [body.name, body.enabled, body.message, body.interval, body.message_threshold, channel, timer],
            (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err.toString());
                    return;
                }else if (!results.affectedRows) { 
                    res.writeHead(404);
                    res.end(`Timer ${timer} not found for channel ${channel}`);
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
    const timer = args[1];
    channelExistsInDB(db, channel).then(_ => {
        db.query(`DELETE FROM timers where channel_id=? and name=?`, [channel, timer], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(err.toString());
                return;
            }else if (!results.affectedRows) { 
                res.writeHead(404);
                res.end(`Timer ${timer} not found for channel ${channel}`);
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