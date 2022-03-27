// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const { httpsRequest } = require("../../utils");
const DBService = require("../../dbservice");
const crypto = require("crypto");

const post = (actions, sessionPool, req, res) => {
    const code = req.body ? req.body.code : null;
    const { AUTH_REDIRECT_URL, CLIENT_ID, CLIENT_SECRET } = process.env;
    if (code) {
        httpsRequest(
            `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${AUTH_REDIRECT_URL}`,
            { method: "POST" }
        )
            .then((r) => {
                let headers = {
                    "Client-ID": CLIENT_ID,
                    Authorization: `Bearer ${r.access_token}`,
                };
                httpsRequest(`https://api.twitch.tv/helix/users`, { headers: headers, method: "GET" })
                    .then((user) => {
                        const createSession = () => {
                            actions.refreshChannelData(user.data[0].id);
                            let sessionId = crypto.randomBytes(20).toString("hex").slice(0, 20);
                            while (sessionPool[sessionId]) {
                                sessionId = crypto.randomBytes(20).toString("hex").slice(0, 20);
                            }
                            sessionPool[sessionId] = {
                                channel_id: user.data[0].id,
                                timeout: setTimeout(() => {
                                    delete sessionPool[sessionId];
                                }, r.expires_in * 1000),
                            };
                            res.status(200).json({ user_data: user.data[0], session_token: sessionId });
                        };
                        DBService.getChannel(user.data[0].id)
                            .then((data) => {
                                if (data) {
                                    DBService.updateTokensForChannel(user.data[0].id, r.access_token, r.refresh_token)
                                        .then(() => {
                                            createSession();
                                        })
                                        .catch((err) => {
                                            res.status(500).send(encodeURIComponent(err.toString()));
                                        });
                                } else {
                                    DBService.initChannel(
                                        user.data[0].id,
                                        user.data[0].login,
                                        r.access_token,
                                        r.refresh_token
                                    )
                                        .then(() => {
                                            createSession();
                                        })
                                        .catch((err) => {
                                            res.status(500).send(encodeURIComponent(err.toString()));
                                        });
                                }
                            })
                            .catch((err) => {
                                res.status(500).send(encodeURIComponent(err.toString()));
                            });
                    })
                    .catch((err) => {
                        res.status(500).send(encodeURIComponent(err.toString()));
                    });
            })
            .catch((err) => {
                res.status(500).send(encodeURIComponent(err.toString()));
            });
    } else res.status(400).send("Missing authentication code in request body");
};

module.exports = {
    post,
};
