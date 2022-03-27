// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const twitchAPI = require("../../External Data APIs/twitch");
const ChannelManager = require("../../ChannelManager/channelManager");
const { getLengthDataFromMillis } = require("../../utils");

module.exports = [
    {
        tag: "{{followage}}",
        dataFetch: (channel, userstate) => {
            return new Promise((resolve, reject) => {
                twitchAPI
                    .getFollowData(userstate["user-id"], ChannelManager.getChannel(channel).getId())
                    .then((data) => {
                        if (data) {
                            const length = getLengthDataFromMillis(Date.now() - Date.parse(data.followed_at));
                            const val = `
                            ${length.years > 0 ? `${length.years} year${length.years > 1 ? "s" : ""}` : ""}
                            ${length.months > 0 ? `${length.months} month${length.months > 1 ? "s" : ""}` : ""}
                            ${length.days > 0 ? `${length.days} day${length.days > 1 ? "s" : ""}` : ""}
                        `;
                            resolve({ tag: "{{followage}}", value: val });
                        } else {
                            resolve({ tag: "{{followage}}", value: `${user} does not follow ${channel}` });
                        }
                    })
                    .catch((err) => {
                        reject({ tag: "{{followage}}", reason: "error fetching followage data" });
                    });
            });
        },
    },
    {
        tag: "{{followcount}}",
        dataFetch: (channel, userstate) => {
            return new Promise((resolve, reject) => {
                twitchAPI
                    .getFollowCount(ChannelManager.getChannel(channel).getId())
                    .then((data) => {
                        resolve({ tag: "{{followcount}}", value: data });
                    })
                    .catch((err) => {
                        reject({ tag: "{{followcount}}", reason: "error fetching followcount data" });
                    });
            });
        },
    },
    {
        tag: "{{subcount}}",
        dataFetch: (channel, userstate) => {
            return new Promise((resolve, reject) => {
                twitchAPI
                    .getSubCount(ChannelManager.getChannel(channel).getId())
                    .then((data) => {
                        resolve({ tag: "{{subcount}}", value: data });
                    })
                    .catch((err) => {
                        reject({ tag: "{{subcount}}", reason: "error fetching subcount data" });
                    });
            });
        },
    },
    {
        tag: "{{uptime}}",
        dataFetch: (channel, userstate) => {
            return new Promise((resolve, reject) => {
                twitchAPI
                    .getStreamData(channel)
                    .then((data) => {
                        if (data) {
                            const length = getLengthDataFromMillis(Date.now() - Date.parse(data.started_at));
                            const val = `
                                ${length.days > 0 ? `${length.days} day${length.days > 1 ? "s" : ""}` : ""}
                                ${length.hours > 0 ? `${length.hours} hour${length.hours > 1 ? "s" : ""}` : ""}
                                ${length.minutes > 0 ? `${length.minutes} minute${length.minutes > 1 ? "s" : ""}` : ""}
                                ${length.seconds > 0 ? `${length.seconds} second${length.seconds > 1 ? "s" : ""}` : ""}
                            `;
                            resolve({ tag: "{{uptime}}", value: val });
                        } else {
                            resolve({ tag: "{{uptime}}", value: `${channel} is not live` });
                        }
                    })
                    .catch((err) => {
                        reject({ tag: "{{uptime}}", reason: "error fetching uptime data" });
                    });
            });
        },
    },
    {
        tag: "{{game}}",
        dataFetch: (channel, userstate) => {
            return new Promise((resolve, reject) => {
                twitchAPI
                    .getStreamData(channel)
                    .then((data) => {
                        if (data) {
                            twitchAPI
                                .getGameName(data.game_id)
                                .then((name) => {
                                    resolve({ tag: "{{game}}", value: name });
                                })
                                .catch((err) => {
                                    reject({ tag: "{{game}}", reason: "error fetching game data" });
                                });
                        } else {
                            resolve({ tag: "{{game}}", value: `${channel} is not live` });
                        }
                    })
                    .catch((err) => {
                        reject({ tag: "{{game}}", reason: "error fetching game data" });
                    });
            });
        },
    },
];
