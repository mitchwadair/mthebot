// Copyright (c) 2020-2025 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const { request, timedLog } = require("../utils");
const DBService = require("../dbservice");

const { CLIENT_ID, CLIENT_SECRET, BOT_USER_ID } = process.env;

// conveniently, TES will initialize appAccessToken on startup
// by calling `getNewAppAccessToken`.  MtheBot_'s call to
// getAppAccessToken will wait until this is defined to resolve
let appAccessToken;
let validationInterval;

const createHeaderObject = (token) => {
    return {
        "client-id": CLIENT_ID,
        authorization: `Bearer ${token}`,
    };
};

const validateToken = async (token) => {
    timedLog("validating app access token...");
    const res = await fetch("https://id.twitch.tv/oauth2/validate", {
        headers: createHeaderObject(token),
    });
    if (res.status === 401) {
        timedLog("app access token not valid, refreshing...");
        await getNewAppAccessToken();
        resetValidationInterval();
    }
};

const getTokenForChannel = async (id) => {
    const { access_token } = await DBService.getTokensForChannel(id);
    return access_token;
};

const getNewUserAuthToken = async (id) => {
    timedLog("fetching new user authentication token...");
    const { refresh_token: rt } = await DBService.getTokensForChannel(id);
    const res = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${rt}`,
        { method: "POST" }
    );
    const { access_token, refresh_token } = res.json();
    await DBService.updateTokensForChannel(id, access_token, refresh_token);
    return access_token;
};

const getNewAppAccessToken = async () => {
    timedLog("fetching new app access token...");
    appAccessToken = undefined;
    const res = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
        { method: "POST" }
    );
    const { access_token } = await res.json();
    appAccessToken = access_token;
    return appAccessToken;
};

const getAppAccessToken = () => {
    return new Promise((resolve, reject) => {
        const start = new Date();
        const retry = () => {
            if (appAccessToken) {
                resolve(appAccessToken);
            } else if (new Date() - start > 1000000) {
                const message = "Timed out trying to get token";
                reject(message);
            } else {
                setTimeout(retry);
            }
        };
        retry();
    });
};

const resetValidationInterval = () => {
    clearInterval(validationInterval);
    validationInterval = setInterval(validateToken, 3600000);
};

module.exports = {
    getUser: async (key, isByLogin = false) => {
        const token = await getAppAccessToken();
        const query = isByLogin ? "login" : "id";
        const { data } = await request(
            `https://api.twitch.tv/helix/users?${query}=${key}`,
            { headers: createHeaderObject(token) },
            getNewAppAccessToken
        );
        return data[0];
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
            const { data } = await request(
                `https://api.twitch.tv/helix/users?${queryString}`,
                { headers: createHeaderObject(token) },
                getNewAppAccessToken
            );
            data.forEach((user) => {
                users.push({ id: user.id, name: user.login });
            });
        }
        return users;
    },
    getFollowData: async (fromID, toID) => {
        const token = await getTokenForChannel(toID);
        const { data } = await request(
            `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${toID}&user_id=${fromID}`,
            { headers: createHeaderObject(token) },
            getNewAppAccessToken
        );
        return data[0];
    },
    getFollowCount: async (channelID) => {
        const token = await getAppAccessToken();
        const { total } = await request(
            `https://api.twitch.tv/helix/channels/followers?broadcaster_id=${channelID}&first=1`,
            { headers: createHeaderObject(token) },
            getNewAppAccessToken
        );
        return total;
    },
    getSubCount: async (channelID) => {
        const token = await getTokenForChannel(channelID);
        const { total } = await request(
            `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${channelID}`,
            { headers: createHeaderObject(token) },
            () => getNewUserAuthToken(channelID)
        );
        return total;
    },
    getStreamData: async (loginName) => {
        const token = await getAppAccessToken();
        const { data } = await request(
            `https://api.twitch.tv/helix/streams?user_login=${loginName}`,
            { headers: createHeaderObject(token) },
            getNewAppAccessToken
        );
        return data[0];
    },
    setModeratorStatus: async (channelID, add) => {
        const token = await getTokenForChannel(channelID);
        await request(
            `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${channelID}&user_id=${BOT_USER_ID}`,
            { method: add ? "POST" : "DELETE", headers: createHeaderObject(token) },
            () => getNewUserAuthToken(channelID)
        );
    },
    getNewAppAccessToken,
};
