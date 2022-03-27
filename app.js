// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

require("dotenv").config();
const tmi = require("tmi.js");
const TES = require("tesjs");
const APIServer = require("./API Server/apiserver");
const DBService = require("./dbservice");
const ChannelManager = require("./ChannelManager/channelManager");
const twitchAPI = require("./External Data APIs/twitch");
const { timedLog, getUserLevel } = require("./utils");
const TimerEmitter = require("./timerEmitter");
const DATA_TAGS = require("./DataTags/datatags");

const { BOT_USERNAME, OAUTH_TOKEN, CLIENT_ID, CLIENT_SECRET, TES_BASE_URL } = process.env;

// ===================== HELPER FUNCTIONS =====================

// extend Array to include a 'chunk' function
// use function rather than arrow func to access 'this'
// makes shallow copy of current array, then splits the array into chunks of the given max chunk size and returns it
Array.prototype.chunk = function (maxChunkSize) {
    let copy = [...this];
    let chunks = [];
    while (copy.length) {
        const size = copy.length > maxChunkSize ? maxChunkSize : copy.length;
        chunks.push(copy.splice(0, size));
    }
    return chunks;
};

// ===================== EVENT HANDLERS =====================

const onConnected = async (address, port) => {
    timedLog(`** MtheBot_ connected to ${address}:${port}`);
    timedLog(`** joining all serviced channels...`);
    try {
        const channels = await DBService.getEnabledChannels();
        const channelData = await twitchAPI.getBatchUsersByID(channels);
        const batches = channelData.chunk(50);
        for (const [batch, i] of batches.entries()) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    let joinPromises = [];
                    batch.forEach((user) => {
                        joinPromises.push(client.join(user.name));
                    });
                    Promise.all(joinPromises).then(resolve);
                }, i * 15000);
            });
        }
        timedLog(`** BOT: All channels joined`);
    } catch (error) {
        timedLog(`** BOT: Error joining channels: ${e}`);
    }
};

const onChat = async (channelKey, userstate, message, self) => {
    if (self) return;

    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        channel.incrementTimers();
        const full = message.trim();

        if (full.startsWith("!")) {
            const userLevel = getUserLevel(userstate);
            const args = full.split(" ");
            const alias = args.shift().substring(1);
            const command = channel.getCommand(alias);

            if (command && !command.isOnCooldown && userLevel >= command.user_level) {
                command.isOnCooldown = true;
                setTimeout(() => {
                    command.isOnCooldown = false;
                }, command.cooldown * 1000);

                let message = command.message
                    .replace(new RegExp("{{sender}}", "g"), userstate["display-name"])
                    .replace(new RegExp("{{channel}}", "g"), channelName)
                    .replace(
                        new RegExp("{{commands}}", "g"),
                        channel
                            .getCommands()
                            .filter((c) => c.user_level === 0)
                            .map((c) => `!${c.alias}`)
                            .join(", ")
                    );
                for (const { tag, dataFetch } of DATA_TAGS) {
                    if (message.includes(tag)) {
                        const value = await dataFetch(channelName, userstate);
                        message = message.replace(new RegExp(tag, "g"), value);
                    }
                }

                client.say(channelKey, message);
            }
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onHost = async (channelKey, username, viewers, autohost) => {
    if (!autohost) {
        const channelName = channelKey.substring(1);
        try {
            const channel = await ChannelManager.processChannel(channelName);
            const data = channel.getEvents().host;
            if (data.enabled) {
                let message = data.message
                    .replace(new RegExp("{{user}}", "g"), username)
                    .replace(new RegExp("{{viewers}}", "g"), viewers);
                client.say(channelKey, message);
            }
        } catch (err) {
            timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
        }
    }
};

const onRaid = async (channelKey, username, viewers) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().raid;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{viewers}}", "g"), viewers);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onResub = async (channelKey, username, monthStreak, _message, userstate, methods) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().resub;
        if (data.enabled) {
            const months = ~~userstate["msg-param-cumulative-months"];
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{months}}", "g"), months)
                .replace(new RegExp("{{streak}}", "g"), monthStreak)
                .replace(new RegExp("{{type}}", "g"), methods.planName);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onSubGift = async (channelKey, username, monthStreak, recipient, methods, userstate) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().subgift;
        if (data.enabled) {
            const total = ~~userstate["msg-param-sender-count"];
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{total}}", "g"), total)
                .replace(new RegExp("{{streak}}", "g"), monthStreak)
                .replace(new RegExp("{{recipient}}", "g"), recipient)
                .replace(new RegExp("{{type}}", "g"), methods.planName);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onSubMysteryGift = async (channelKey, username, numbOfSubs, methods, userstate) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().mysterygift;
        if (data.enabled) {
            const total = ~~userstate["msg-param-sender-count"];
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{total}}", "g"), total)
                .replace(new RegExp("{{count}}", "g"), numbOfSubs)
                .replace(new RegExp("{{type}}", "g"), methods.planName);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onSub = async (channelKey, username, methods, _message, _userstate) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().sub;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{type}}", "g"), methods.planName);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onAnonGiftUpgrade = async (channelKey, username, _userstate) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().anongiftupgrade;
        if (data.enabled) {
            let message = data.message.replace(new RegExp("{{user}}", "g"), username);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onGiftUpgrade = async (channelKey, username, sender, _userstate) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().giftupgrade;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{gifter}}", "g"), sender);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onCheer = async (channelKey, userstate, _message) => {
    const channelName = channelKey.substring(1);
    try {
        const channel = await ChannelManager.processChannel(channelName);
        const data = channel.getEvents().cheer;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp("{{user}}", "g"), username)
                .replace(new RegExp("{{amount}}", "g"), userstate.bits);
            client.say(channelKey, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelName}: ${err}`);
    }
};

const onFollow = async ({ broadcaster_user_login, user_name }) => {
    try {
        const channel = await ChannelManager.processChannel(broadcaster_user_login);
        const data = channel.getEvents().follow;
        if (data.enabled) {
            let message = data.message.replace(new RegExp("{{user}}", "g"), user_name);
            client.say(`#${broadcaster_user_login}`, message);
        }
    } catch (err) {
        timedLog(`** BOT: ERROR ON CHANNEL ${broadcaster_user_login}: ${err}`);
    }
};

// ===================== INIT CHAT BOT =====================

const tmiConfig = {
    identity: {
        username: BOT_USERNAME,
        password: OAUTH_TOKEN,
    },
    channels: ["MtheB_"],
    connection: {
        reconnect: true,
        secure: true,
    },
};

const client = new tmi.client(tmiConfig);

// EVENT HANDLER REGISTRATION
client.on("connected", onConnected);
client.on("chat", onChat);
client.on("hosted", onHost);
client.on("raided", onRaid);
client.on("resub", onResub);
client.on("subgift", onSubGift);
client.on("submysterygift", onSubMysteryGift);
client.on("subscription", onSub);
client.on("paidgiftupgrade", onGiftUpgrade);
client.on("anonpaidgiftupgrade", onAnonGiftUpgrade);
client.on("cheer", onCheer);

client.connect();
new TimerEmitter(client);

// ===================== INIT API SERVER =====================

const actions = {
    refreshChannelData: async (channelID) => {
        try {
            const channel = await DBService.getChannel(channelID);
            if (ChannelManager.getChannel(channel.name) !== undefined) {
                timedLog(`** refreshing data for channel ${channel.name}...`);
                ChannelManager.deleteChannel(channel.name);
                await ChannelManager.fetchChannelData(channel.name);
                timedLog(`** refreshed channel ${channel.name}`);
            }
        } catch (err) {
            timedLog(`** ERROR refreshing channel ${channelID}: ${err}`);
        }
    },
    joinChannel: async (channelID) => {
        try {
            const data = await twitchAPI.getUser(channelID);
            if (data) {
                await client.join(data.name);
            }
        } catch (err) {
            timedLog(`** ERROR joining channel ${channelID}: ${err}`);
        }
    },
    leaveChannel: async (channelID) => {
        try {
            const data = await twitchAPI.getUser(channelID);
            if (data) {
                await client.part(data.name);
            }
        } catch (err) {
            timedLog(`** ERROR leaving channel ${channelID}: ${err}`);
        }
    },
    subscribeFollow: (channelID) => {
        const condition = { broadcaster_user_id: channelID };
        return tes.subscribe("channel.follow", condition);
    },
    unsubscribeFollow: (channel) => {
        const condition = { broadcaster_user_id: channel };
        return tes.unsubscribe("channel.follow", condition);
    },
};

const server = APIServer(actions);

// ===================== INIT TES =====================

const tesConfig = {
    identity: {
        id: CLIENT_ID,
        secret: CLIENT_SECRET,
    },
    listener: {
        baseURL: TES_BASE_URL,
        server: server,
    },
};

const tes = new TES(tesConfig);

tes.on("channel.follow", onFollow);
