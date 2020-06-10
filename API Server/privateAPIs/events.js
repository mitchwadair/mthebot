// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');
const getChannelFromURL = require('../utils').getChannelFromURL;

const get = (db, req, res) => {
    const channel = getChannelFromURL(req.url);
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
        res.writeHead(200);
        res.end(results[0].events);
    });
}

const post = (db, actions, req, res) => {
    const channel = getChannelFromURL(req.url);
    let body = [];
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = Buffer.concat(body).toString();
        db.query(`UPDATE channels SET events=? WHERE name=?`, [body,channel], err => {
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
}

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'GET':
            get(db, req, res);
            break;
        case 'POST':
            post(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}