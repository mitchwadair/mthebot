// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const fetch = require("node-fetch");
const DBService = require("../../dbservice");
const crypto = require("crypto");

const post = async (actions, sessionPool, req, res) => {
    const createSession = (user, expiresIn) => {
        actions.refreshChannelData(user.id);
        let sessionId = crypto.randomBytes(20).toString("hex").slice(0, 20);
        while (sessionPool[sessionId]) {
            sessionId = crypto.randomBytes(20).toString("hex").slice(0, 20);
        }
        sessionPool[sessionId] = {
            channel_id: user.id,
            timeout: setTimeout(() => {
                delete sessionPool[sessionId];
            }, expiresIn * 1000),
        };
        res.status(200).json({ user_data: user, session_token: sessionId });
    };

    const code = req.body?.code;
    const { AUTH_REDIRECT_URL, CLIENT_ID, CLIENT_SECRET } = process.env;

    if (code) {
        try {
            const tokenResponse = await fetch(
                `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${code}&grant_type=authorization_code&redirect_uri=${AUTH_REDIRECT_URL}`,
                { method: "POST" }
            );
            const { access_token, refresh_token, expires_in } = await tokenResponse.json();
            const headers = {
                "client-id": CLIENT_ID,
                authorization: `Bearer ${access_token}`,
            };
            const userResponse = await fetch(`https://api.twitch.tv/helix/users`, { headers, method: "GET" });
            const {
                data: [user],
            } = await userResponse.json();
            const data = await DBService.getChannel(user.id);
            if (data) {
                await DBService.updateTokensForChannel(user.id, access_token, refresh_token);
            } else {
                await DBService.initChannel(user.id, user.login, access_token, refresh_token);
            }
            createSession(user, expires_in);
        } catch (err) {
            res.status(500).send(err.message);
        }
    } else {
        res.status(400).send("Missing authentication code in request body");
    }
};

module.exports = {
    post,
};
