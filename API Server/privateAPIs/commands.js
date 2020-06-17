// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {getArgsFromURL, channelExistsInDB} = require('../utils');

const get = (db, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const cmd = args[1];
    channelExistsInDB(db, channel).then(_ => {
        if (cmd) {
            let JSONquery = `JSON_EXTRACT(commands, JSON_UNQUOTE(REPLACE(JSON_SEARCH(commands, 'one', ?, NULL, '$[*].alias'), '.alias', ''))) as cmd`;
            let JSONcontains = `JSON_CONTAINS(commands, JSON_OBJECT('alias', ?))`;
            db.query(`SELECT ${JSONquery} FROM channels WHERE name=? and ${JSONcontains}`, [cmd, channel, cmd], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                } else if (!results.length) {
                    res.writeHead(404);
                    res.end(`Command ${cmd} not found for channel ${channel}`);
                    return;
                }
                res.writeHead(200);
                res.end(results[0].cmd);
            });
        } else {
            db.query(`SELECT commands FROM channels WHERE name=?`, [channel], (err, results) => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                }
                res.writeHead(200);
                res.end(results[0].commands);
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
            db.query(`UPDATE channels SET commands=JSON_ARRAY_APPEND(commands, '$', CAST(? AS JSON)) WHERE name=?`, [body,channel], err => {
                if (err) {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                    return;
                }
                actions.refreshChannelData(channel);
                res.writeHead(200);
                res.end();
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
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = Buffer.concat(body).toString();
        db.query(`SELECT commands FROM channels WHERE name=?`, [channel], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            } else if (!results.length) {
                res.writeHead(404);
                res.end(`Channel ${channel} not found`);
                return;
            }
            let commands = JSON.parse(results[0].commands);
            const i = commands.findIndex(command => command.alias === cmd);
            if (~~i) {
                res.writeHead(404);
                res.end(`Command ${cmd} for channel ${channel} not found`);
            } else {
                commands[i] = JSON.parse(body);
                db.query(`UPDATE channels SET commands=? WHERE name=?`, [JSON.stringify(commands), channel], (err, results) => {
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
    });
}

const remove = (db, actions, req, res) => {
    const args = getArgsFromURL(req.url);
    const channel = args[0];
    const cmd = args[1];
    db.query(`SELECT commands FROM channels WHERE name=?`, [channel], (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        } else if (!results.length) {
            res.writeHead(404);
            res.end(`Channel ${channel} not found`);
            return;
        }
        let commands = JSON.parse(results[0].commands);
        const i = commands.findIndex(command => command.alias === cmd);
        if (~~i) {
            res.writeHead(404);
            res.end(`Command ${cmd} for channel ${channel} not found`);
        } else {
            commands.splice(i, 1);
            db.query(`UPDATE channels SET commands=? WHERE name=?`, [JSON.stringify(commands), channel], (err, results) => {
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