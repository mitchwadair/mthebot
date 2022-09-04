// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const { request } = require("../utils");
const DBService = require("../dbservice");

const { CLIENT_ID, CLIENT_SECRET } = process.env;

let appAccessToken;

const createHeaderObject = (token) => {
    return {
        "client-id": CLIENT_ID,
        Authorization: `Bearer ${token}`,
    };
};

const validateToken = async (token) => {
    const data = await request("https://id.twitch.tv/oauth2/validate", {
        method: "GET",
        headers: createHeaderObject(token),
    });
    if (data.status === 401 && data.message === "invalid access token") {
        throw new Error(data.message);
    }
};

const getTokenForChannel = async (id) => {
    let tokens;
    try {
        tokens = await DBService.getTokensForChannel(id);
        await validateToken(tokens.access_token);
        return tokens.access_token;
    } catch (err) {
        if (err.message === "invalid access token") {
            const { access_token, refresh_token } = await request(
                `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${tokens.refresh_token}`,
                { method: "POST" }
            );
            await DBService.updateTokensForChannel(id, access_token, refresh_token);
            return access_token;
        }
        throw err;
    }
};

const getNewToken = async () => {
    const data = await request(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
        { method: "POST" }
    );
    appAccessToken = data.access_token;
    return appAccessToken;
};

const getAppAccessToken = async () => {
    if (appAccessToken) {
        try {
            await validateToken(appAccessToken);
            return appAccessToken;
        } catch {
            return await getNewToken();
        }
    } else {
        return await getNewToken();
    }
};

module.exports = {
    getUser: async (key, isByLogin = false) => {
        const token = await getAppAccessToken();
        const query = isByLogin ? "login" : "id";
        const data = await request(`https://api.twitch.tv/helix/users?${query}=${key}`, {
            headers: createHeaderObject(token),
            method: "GET",
        });
        return data.data[0];
    },
    getBatchUsersByID: async (ids) => {
        const token = await getAppAccessToken();
        let chunks = ids.chunk(100);
        let users = [];
        for (const chunk of chunks) {
            let queryString = "";
            chunk.forEach((id) => {
                queryString = `${queryString}id=${id}&`;
            });
            const { data } = await request(`https://api.twitch.tv/helix/users?${queryString}`, {
                headers: createHeaderObject(token),
                method: "GET",
            });
            data.forEach((user) => {
                users.push({ id: user.id, name: user.login });
            });
        }
        return users;
    },
    getFollowData: async (fromID, toID) => {
        const token = await getAppAccessToken();
        const data = await request(`https://api.twitch.tv/helix/users/follows?from_id=${fromID}&to_id=${toID}`, {
            headers: createHeaderObject(token),
            method: "GET",
        });
        return data.data[0];
    },
    getFollowCount: async (channelID) => {
        const token = await getAppAccessToken();
        const { total } = await request(`https://api.twitch.tv/helix/users/follows?to_id=${channelID}&first=1`, {
            headers: createHeaderObject(token),
            method: "GET",
        });
        return total;
    },
    getSubCount: async (channelID) => {
        const token = await getTokenForChannel(channelID);
        const { total } = await request(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${channelID}`, {
            headers: createHeaderObject(token),
            method: "GET",
        });
        return total;
    },
    getStreamData: async (loginName) => {
        const token = await getAppAccessToken();
        const data = await request(`https://api.twitch.tv/helix/streams?user_login=${loginName}`, {
            headers: createHeaderObject(token),
            method: "GET",
        });
        return data.data[0];
    },
};
