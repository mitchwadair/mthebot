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
        db.query(`SELECT events FROM channels WHERE name=?`, [channel], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            }
            if (evt) {
                const events = JSON.parse(results[0].events)
                if (!Object.keys(events).includes(evt)) {
                    res.writeHead(404)
                    res.end(`Event ${evt} for channel ${channel} not found`);
                    return;
                }
                res.writeHead(200);
                res.end(JSON.stringify(events[evt]));
            } else {
                res.writeHead(200);
                res.end(results[0].events);
            }
        });
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
        db.query(`SELECT events FROM channels WHERE name=?`, [channel], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            } else if (!results.length) {
                res.writeHead(404);
                res.end(`Channel ${channel} not found`);
                return;
            }
            let events = JSON.parse(results[0].events);
            if (!events[evt]) {
                res.writeHead(404);
                res.end(`Event ${evt} for channel ${channel} not found`);
            } else {
                events[evt] = JSON.parse(body);
                db.query(`UPDATE channels SET events=? WHERE name=?`, [JSON.stringify(events), channel], (err, results) => {
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