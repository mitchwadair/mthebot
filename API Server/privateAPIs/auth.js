// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const https = require('https');

const post = (db, actions, req, res) => {
    const channel = req.params.channel;
    let body = req.body;
    const updateTokenInDB = _ => {
        db.query(`UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE id=?`, [body.token,channel], err => {
            if (err) {
                res.status(500).send(err.toString());
                return;
            }
            actions.refreshChannelData(channel);
            res.status(200).send();
        });
    }

    db.query(`SELECT AES_DECRYPT(token, '${process.env.CLIENT_SECRET}') AS token FROM channels WHERE id=?`, [channel], (err, results) => {
        if (err) {
            console.log(err);
            res.status(500).send(err.toString());
            return;
        }
        const token = results[0].token ? results[0].token.toString() : null;
        if (token) {
            https.request(`https://id.twitch.tv/oauth2/revoke?client_id=${process.env.CLIENT_ID}&token=${token}`, {method: 'POST'}, _ => {
                updateTokenInDB();
            }).on('error', err => {
                res.status(500).send(err.toString());
            }).end();
        } else {
            updateTokenInDB();
        }
    });
}

module.exports = {
    post
}