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
        dataFetch: async (channel, userstate) => {
            try {
                const data = await twitchAPI.getFollowData(
                    userstate["user-id"],
                    ChannelManager.getChannel(channel).getId()
                );
                if (data) {
                    const { years, months, days } = getLengthDataFromMillis(Date.now() - Date.parse(data.followed_at));
                    const val = `
                        ${years > 0 ? `${years} year${years > 1 ? "s" : ""}` : ""}
                        ${months > 0 ? `${months} month${months > 1 ? "s" : ""}` : ""}
                        ${days > 0 ? `${days} day${days > 1 ? "s" : ""}` : ""}
                    `;
                    return val;
                } else {
                    return `${userstate["username"]} does not follow ${channel}`;
                }
            } catch {
                return "error fetching followage data";
            }
        },
    },
    {
        tag: "{{followcount}}",
        dataFetch: async (channel, _userstate) => {
            try {
                return await twitchAPI.getFollowCount(ChannelManager.getChannel(channel).getId());
            } catch {
                return "error fetching followcount data";
            }
        },
    },
    {
        tag: "{{subcount}}",
        dataFetch: async (channel, _userstate) => {
            try {
                return await twitchAPI.getSubCount(ChannelManager.getChannel(channel).getId());
            } catch {
                return "error fetching subcount data";
            }
        },
    },
    {
        tag: "{{uptime}}",
        dataFetch: async (channel, _userstate) => {
            try {
                const data = await twitchAPI.getStreamData(channel);
                if (data) {
                    const { days, hours, minutes, seconds } = getLengthDataFromMillis(
                        Date.now() - Date.parse(data.started_at)
                    );
                    const val = `
                        ${days > 0 ? `${days} day${days > 1 ? "s" : ""}` : ""}
                        ${hours > 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : ""}
                        ${minutes > 0 ? `${minutes} minute${minutes > 1 ? "s" : ""}` : ""}
                        ${seconds > 0 ? `${seconds} second${seconds > 1 ? "s" : ""}` : ""}
                    `;
                    return val;
                } else {
                    return `${channel} is not live`;
                }
            } catch {
                return "error fetching uptime data";
            }
        },
    },
    {
        tag: "{{game}}",
        dataFetch: async (channel, _userstate) => {
            try {
                const data = await twitchAPI.getStreamData(channel);
                if (data) {
                    return data.game_name;
                } else {
                    return `${channel} is not live`;
                }
            } catch {
                return "error fetching game data";
            }
        },
    },
];
