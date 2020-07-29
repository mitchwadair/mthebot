// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {getArgsFromURL, channelExistsInDB, validateData} = require('../utils');

const schema = {
    enabled: 'boolean',
    message: 'string'
}

const get = (db, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const evt = args[1];
    channelExistsInDB(db, channel).then(_ => {
        if (evt) {
            db.query(`SELECT * FROM events WHERE channel_id=? and name=?`, [channel, evt], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                } else if (!results.length) {
                    res.writeHead(404);
                    res.end(`Event ${evt} not found for channel ${channel}`);
                    return;
                }
                const responseBody = {
                    name: results[0].name,
                    message: results[0].message,
                    enabled: results[0].enabled,
                }
                res.writeHead(200);
                res.end(JSON.stringify(responseBody));
            });
        } else {
            db.query(`SELECT * FROM events WHERE channel_id=?`, [channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                }
                const responseBody = results.map(c => {
                    return {
                        name: c.name,
                        message: c.message,
                        enabled: c.enabled
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

const put = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const evt = args[1];
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
            `UPDATE events SET name=?, message=?, enabled=? where channel_id=? and name=?`,
            [evt, body.message, body.enabled, channel, evt],
            (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                }else if (!results.affectedRows) { 
                    res.writeHead(404);
                    res.end(`Event ${evt} not found for channel ${channel}`);
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

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'GET':
            get(db, req, res);
            break;
        case 'PUT':
            put(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}