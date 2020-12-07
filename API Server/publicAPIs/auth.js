// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const {httpsRequest} = require('../../utils');
const crypto = require('crypto');

const post = (db, actions, sessionPool, req, res) => {
    const code = req.body.code;
    const redirectURI = process.env.NODE_ENV == 'development' ? 'http://localhost:8081/auth' : 'https://bot.mtheb.tv/auth';
    httpsRequest(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectURI}`,
        {method: 'POST'}
    ).then(r => {
        let headers = {
            'Client-ID': process.env.CLIENT_ID,
            'Authorization': `Bearer ${r.access_token}`
        }
        httpsRequest(`https://api.twitch.tv/helix/users`, {headers: headers, method: 'GET'}).then(data => {
            db.query(
                `UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}'), refresh_token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE id=?`,
                [r.access_token, r.refresh_token, data.data[0].id],
                err => {
                    if (err) {
                        res.status(500).send(err.toString());
                        return;
                    }
                    actions.refreshChannelData(data.data[0].id);
                    const sessionId = crypto.randomBytes(20).toString('hex').slice(0, 20);
                    sessionPool[sessionId] = {
                        channel_id: data.data[0].id,
                        timeout: setTimeout(_ => {
                            delete sessionPool[sessionId]
                        }, r.expires_in * 1000)
                    }
                    res.status(200).json({...data.data[0], session_token: sessionId});
                }
            );
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

module.exports = {
    post
}