// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {getArgsFromURL, channelExistsInDB, validateData} = require('../utils');

const schema = {
    name: 'string',
    enabled: 'boolean',
    message: 'string',
    seconds: 'number',
    messageThreshold: 'number'
}

const get = (db, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const timer = args[1];
    channelExistsInDB(db, channel).then(_ => {
        if (timer) {
            let JSONquery = `JSON_EXTRACT(timers, JSON_UNQUOTE(REPLACE(JSON_SEARCH(timers, 'one', ?, NULL, '$[*].name'), '.name', ''))) as timer`;
            let JSONcontains = `JSON_CONTAINS(timers, JSON_OBJECT('name', ?))`;
            db.query(`SELECT ${JSONquery} FROM channels WHERE id=? and ${JSONcontains}`, [timer, channel, timer], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                } else if (!results.length) {
                    res.writeHead(404);
                    res.end(`Timer ${timer} not found for channel ${channel}`);
                    return;
                }
                res.writeHead(200);
                res.end(results[0].timer);
            });
        } else {
            db.query(`SELECT timers FROM channels WHERE id=?`, [channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                }
                res.writeHead(200);
                res.end(results[0].timers);
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
            body = Buffer.concat(body).toString();
            let validated = validateData(schema, JSON.parse(body));
            if (validated !== true) {
                res.writeHead(400);
                res.end(JSON.stringify(validated));
                return;
            }
            db.query(`UPDATE channels SET timers=JSON_ARRAY_APPEND(timers, '$', CAST(? AS JSON)) WHERE id=?`, [body,channel], err => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                }
                actions.refreshChannelData(channel);
                res.writeHead(200);
                res.end(body);
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
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = Buffer.concat(body).toString();
        let validated = validateData(schema, JSON.parse(body));
        if (validated !== true) {
            res.writeHead(400);
            res.end(JSON.stringify(validated));
            return;
        }
        db.query(`SELECT timers FROM channels WHERE id=?`, [channel], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            } else if (!results.length) {
                res.writeHead(404);
                res.end(`Channel ${channel} not found`);
                return;
            }
            let timers = JSON.parse(results[0].timers);
            const i = timers.findIndex(t => t.name === timer);
            if (!~i) {
                res.writeHead(404);
                res.end(`Timer ${timer} for channel ${channel} not found`);
            } else {
                timers[i] = JSON.parse(body);
                db.query(`UPDATE channels SET timers=? WHERE id=?`, [JSON.stringify(timers), channel], (err, results) => {
                    if (err) {
                        res.writeHead(500);
                        res.end(`ERROR: ${err}`);
                        return;
                    }
                    actions.refreshChannelData(channel);
                    res.writeHead(200);
                    res.end(body);
                });
            }
        });
    });
}

const remove = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const timer = args[1];
    db.query(`SELECT timers FROM channels WHERE id=?`, [channel], (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        } else if (!results.length) {
            res.writeHead(404);
            res.end(`Channel ${channel} not found`);
            return;
        }
        let timers = JSON.parse(results[0].timers);
        const i = timers.findIndex(t => t.name === timer);
        if (!~i) {
            res.writeHead(404);
            res.end(`Timer ${timer} for channel ${channel} not found`);
        } else {
            timers.splice(i, 1);
            db.query(`UPDATE channels SET timers=? WHERE id=?`, [JSON.stringify(timers), channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                }
                actions.refreshChannelData(channel);
                res.writeHead(200);
                res.end();
            });
        }
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