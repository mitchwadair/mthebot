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
    processChannel(channelKey) {
        return new Promise((resolve, reject) => {
            if (this.getChannel(channelKey)) {
                this.refreshChannel(channelKey);
                resolve();
            } else {
                this.fetchChannelData(channelKey)
                    .then(() => {
                        timedLog(`** BOT: Added channel ${channelKey} to active channels`);
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    }

    // get channel data from DB
    fetchChannelData(channelKey) {
        return new Promise((resolve, reject) => {
            twitchAPI
                .getUser(channelKey)
                .then((data) => {
                    DBService.getChannel(data.id)
                        .then((channel) => {
                            if (channel.name !== channelKey) {
                                DBService.updateNameForChannel(channelKey, data.id)
                                    .then(() => {
                                        timedLog(`** updated name for id ${data.id} in DB to ${channelKey}`);
                                    })
                                    .catch((err) => {
                                        timedLog(`** error updating name for id ${data.id}: ${err}`);
                                    });
                            }

                            let commands = [];
                            let events = {};
                            let timers = [];
                            let promises = [];

                            promises.push(
                                new Promise((resolve, reject) => {
                                    DBService.getAllCommandsForChannel(data.id)
                                        .then((cmds) => {
                                            commands = cmds.map((c) => {
                                                return {
                                                    alias: c.alias,
                                                    message: c.message,
                                                    cooldown: c.cooldown,
                                                    user_level: c.user_level,
                                                };
                                            });
                                            resolve();
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                })
                            );
                            promises.push(
                                new Promise((resolve, reject) => {
                                    DBService.getAllEventsForChannel(data.id)
                                        .then((evts) => {
                                            evts.forEach((e) => {
                                                events[e.name] = {
                                                    message: e.message,
                                                    enabled: e.enabled,
                                                };
                                            });
                                            resolve();
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                })
                            );
                            promises.push(
                                new Promise((resolve, reject) => {
                                    DBService.getAllTimersForChannel(data.id)
                                        .then((tmrs) => {
                                            timers = tmrs.map((t) => {
                                                return {
                                                    name: t.name,
                                                    message: t.message,
                                                    enabled: t.enabled,
                                                    interval: t.interval,
                                                    message_threshold: t.message_threshold,
                                                };
                                            });
                                            resolve();
                                        })
                                        .catch((err) => {
                                            reject(err);
                                        });
                                })
                            );

                            Promise.all(promises).then(() => {
                                this.addChannel(channelKey, data.id, commands, events, timers);
                                timedLog(`** fetched data for channel ${channelKey}`);
                                resolve();
                            });
                        })
                        .catch((err) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                    timedLog(`** BOT: Error getting user data for channel ${channelKey}`);
                    reject(err);
                });
        });
    }
}

const instance = new ChannelManager();
module.exports = instance;
