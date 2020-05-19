// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');
const https = require('https');
const getChannelFromURL = require('../utils').getChannelFromURL;

const post = (db, actions, req, res) => {
    const channel = getChannelFromURL(req.url);
    let body = [];
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = JSON.parse(Buffer.concat(body).toString());
        db.query(`SELECT AES_DECRYPT(token, '${process.env.CLIENT_SECRET}') AS token FROM channels WHERE name=?`, [channel], (err, results) => {
            if (err) {
                console.log(err);
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            }
            const token = results[0].token ? results[0].token.toString() : null;
            if (token) {
                https.request(`https://id.twitch.tv/oauth2/revoke?client_id=${process.env.CLIENT_ID}&token=${token}`, {method: 'POST'}, _ => {
                    db.query(`UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE name=?`, [body.token,channel], err => {
                        if (err) {
                            res.writeHead(500);
                            res.end(`ERROR: ${err}`);
                            return;
                        }
                        actions.refreshChannelData(channel);
                        res.writeHead(200);
                        res.end();
                    });
                }).on('error', err => {
                    res.writeHead(500);
                    res.end(`ERROR: ${err}`);
                }).end();
            } else {
                db.query(`UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE name=?`, [body.token,channel], err => {
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

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'POST':
            post(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}