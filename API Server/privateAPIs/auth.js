// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const https = require('https');
const getArgsFromURL = require('../utils').getArgsFromURL;

const post = (db, actions, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    let body = [];
    req.on('error', err => {
        res.writeHead(500);
        res.end(err);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = JSON.parse(Buffer.concat(body).toString());

        const updateTokenInDB = _ => {
            db.query(`UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE id=?`, [body.token,channel], err => {
                if (err) {
                    res.writeHead(500);
                    res.end(err);
                    return;
                }
                actions.refreshChannelData(channel);
                res.writeHead(200);
                res.end();
            });
        }

        db.query(`SELECT AES_DECRYPT(token, '${process.env.CLIENT_SECRET}') AS token FROM channels WHERE id=?`, [channel], (err, results) => {
            if (err) {
                console.log(err);
                res.writeHead(500);
                res.end(err);
                return;
            }
            const token = results[0].token ? results[0].token.toString() : null;
            if (token) {
                https.request(`https://id.twitch.tv/oauth2/revoke?client_id=${process.env.CLIENT_ID}&token=${token}`, {method: 'POST'}, _ => {
                    updateTokenInDB();
                }).on('error', err => {
                    res.writeHead(500);
                    res.end(err);
                }).end();
            } else {
                updateTokenInDB();
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