// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const { timedLog } = require("../utils");
const DBService = require("../dbservice");
const twitchAPI = require("../External Data APIs/twitch");
const Channel = require("./channel");

class ChannelManager {
    constructor() {
        if (!ChannelManager._instance) {
            ChannelManager._instance = this;
        }

        this.channels = {};

        return ChannelManager._instance;
    }

    // get channel data
    getChannel(channelKey) {
        return this.channels[channelKey] ? this.channels[channelKey].channel : undefined;
    }

    // add channel to manager
    addChannel(channelKey, channelId, commands, events, timers) {
        this.channels[channelKey] = {
            channel: new Channel(channelKey, channelId, commands, events, timers),
            timeout: setTimeout(() => {
                this.deleteChannel(channelKey);
            }, 300000),
        };
    }

    // remove a channel from the active channels object
    deleteChannel(channelKey) {
        // clear intervals for timed messages
        let channel = this.getChannel(channelKey);
        if (channel) {
            channel.clearTimers();
            delete this.channels[channelKey];
            timedLog(`** BOT: Removed channel ${channelKey} from active channels`);
        }
    }

    // refresh channel timer
    refreshChannel(channelKey) {
        clearTimeout(this.channels[channelKey].timeout);
        this.channels[channelKey].timeout = setTimeout(() => {
            this.deleteChannel(channelKey);
        }, 300000);
    }

    // process the given channel
    // either restart the timeout func or add the channel to active channels
    async processChannel(channelKey) {
        try {
            if (this.getChannel(channelKey)) {
                this.refreshChannel(channelKey);
            } else {
                await this.fetchChannelData(channelKey);
                timedLog(`** BOT: Added channel ${channelKey} to active channels`);
            }
        } catch (error) {
            timedLog(`** BOT: Error processing channel ${channelKey}`);
        } finally {
            return this.getChannel(channelKey);
        }
    }

    // get channel data from DB
    async fetchChannelData(channelKey) {
        try {
            const { id: channelID } = await twitchAPI.getUser(channelKey);
            const channel = await DBService.getChannel(channelID);

            if (channel.name !== channelKey) {
                await DBService.updateNameForChannel(channelKey, channelID);
                timedLog(`** updated name for id ${channelID} in DB to ${channelKey}`);
            }

            let commands = await DBService.getAllCommandsForChannel(channelID);
            commands = commands.map((c) => {
                return {
                    alias: c.alias,
                    message: c.message,
                    cooldown: c.cooldown,
                    user_level: c.user_level,
                };
            });

            let events = {};
            await DBService.getAllEventsForChannel(channelID).forEach((e) => {
                events[e.name] = {
                    message: e.message,
                    enabled: e.enabled,
                };
            });

            let timers = DBService.getAllTimersForChannel(channelID);
            timers = timers.map((t) => {
                return {
                    name: t.name,
                    message: t.message,
                    enabled: t.enabled,
                    interval: t.interval,
                    message_threshold: t.message_threshold,
                };
            });

            this.addChannel(channelKey, channelID, commands, events, timers);
        } catch (error) {
            timedLog(`** BOT: Error getting user data for channel ${channelKey}`);
        }
    }
}

const instance = new ChannelManager();
module.exports = instance;
