// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

require('dotenv').config();
const tmi = require('tmi.js');
const TES = require('tesjs');
const APIServer = require('./API Server/apiserver');
const DBService = require('./dbservice');
const ChannelManager = require('./ChannelManager/channelManager');
const twitchAPI = require('./External Data APIs/twitch');
const {timedLog, getUserLevel} = require('./utils');
const TimerEmitter = require('./timerEmitter');
const DATA_TAGS = require('./DataTags/datatags');

// ===================== HELPER FUNCTIONS =====================

// extend Array to include a 'chunk' function
// use function rather than arrow func to access 'this'
// makes shallow copy of current array, then splits the array into chunks of the given max chunk size and returns it
Array.prototype.chunk = function(maxChunkSize) {
    let copy = [...this];
    let chunks = [];
    while (copy.length) {
        const size = copy.length > maxChunkSize ? maxChunkSize : copy.length;
        chunks.push(copy.splice(0, size));
    }
    return chunks;
}

// ===================== EVENT HANDLERS =====================

const onConnected = (address, port) => {
    timedLog(`** MtheBot_ connected to ${address}:${port}`);
    timedLog(`** joining all serviced channels...`);
    DBService.getEnabledChannels().then(channels => {
        twitchAPI.getBatchUsersByID(channels).then(data => {
            let batches = data.chunk(50);
            let promises = [];
            batches.forEach((batch, i) => {
                promises.push(new Promise((resolve, reject) => {
                    setTimeout(_ => {
                        let joinPromises = [];
                        batch.forEach(user => {
                            joinPromises.push(client.join(user.name));
                        });
                        Promise.all(joinPromises).then(_ => {
                            resolve();
                        }).catch(e => {
                            reject(e);
                        })
                    }, i * 15000);
                }));
            });
            Promise.all(promises).then(_ => {
                timedLog(`** BOT: All channels joined`);
            }).catch(e => {
                timedLog(`** BOT: Error joining channels: ${e}`);
            });
        });
    });
}

const onChat = (channel, userstate, message, self) => {
    if (self) return;

    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        ChannelManager.getChannel(channelKey).incrementTimers();
        const full = message.trim();

        if (full.startsWith('!')) {
            const userLevel = getUserLevel(userstate);
            const args = full.split(' ');
            const alias = args.shift().substring(1);
            const command = ChannelManager.getChannel(channelKey).getCommand(alias);
            
            if (command && !command.isOnCooldown && userLevel >= command.user_level) {
                command.isOnCooldown = true;
                setTimeout(_ => {command.isOnCooldown = false}, command.cooldown * 1000);
                let message = command.message
                    .replace(new RegExp('{{sender}}', 'g'), userstate['display-name'])
                    .replace(new RegExp('{{channel}}', 'g'), channelKey)
                    .replace(new RegExp('{{commands}}', 'g'), ChannelManager.getChannel(channelKey).getCommands().filter(c => c.user_level === 0).map(c => `!${c.alias}`).join(', '));
                let messagePromises = [];
                DATA_TAGS.forEach(dt => {
                    if (message.includes(dt.tag)) {
                        messagePromises.push(dt.dataFetch(channelKey, userstate));
                    }
                });
                Promise.allSettled(messagePromises).then(results => {
                    results.forEach(r => {
                        if (r.status === 'fulfilled') {
                            message = message.replace(new RegExp(r.value.tag, 'g'), r.value.value);
                        } else {
                            message = message.replace(new RegExp(r.reason.tag, 'g'), r.reason.reason);
                        }
                    });
                    client.say(channel, message);
                });
            }
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onHost = (channel, username, viewers, autohost) => {
    if (!autohost) {
        const channelKey = channel.substring(1);
        ChannelManager.processChannel(channelKey).then(_ => {
            const data = ChannelManager.getChannel(channelKey).getEvents().host;
            if (data.enabled) {
                let message = data.message
                    .replace(new RegExp('{{user}}', 'g'), username)
                    .replace(new RegExp('{{viewers}}', 'g'), viewers);
                client.say(channel, message);
            }
        }).catch(err => {
            timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
        });
    }
}

const onRaid = (channel, username, viewers) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().raid;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{viewers}}', 'g'), viewers);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onResub = (channel, username, monthStreak, message, userstate, methods) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().resub;
        if (data.enabled) {
            const months = ~~userstate["msg-param-cumulative-months"];
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{months}}', 'g'), months)
                .replace(new RegExp('{{streak}}', 'g'), monthStreak)
                .replace(new RegExp('{{type}}', 'g'), methods.planName);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSubGift = (channel, username, monthStreak, recipient, methods, userstate) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().subgift;
        if (data.enabled) {
            const total = ~~userstate["msg-param-sender-count"];
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{total}}', 'g'), total)
                .replace(new RegExp('{{streak}}', 'g'), monthStreak)
                .replace(new RegExp('{{recipient}}', 'g'), recipient)
                .replace(new RegExp('{{type}}', 'g'), methods.planName);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSubMysteryGift = (channel, username, numbOfSubs, methods, userstate) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().mysterygift;
        if (data.enabled) {
            const total = ~~userstate["msg-param-sender-count"];
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{total}}', 'g'), total)
                .replace(new RegExp('{{count}}', 'g'), numbOfSubs)
                .replace(new RegExp('{{type}}', 'g'), methods.planName);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSub = (channel, username, methods, message, userstate) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().sub;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{type}}', 'g'), methods.planName);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onAnonGiftUpgrade = (channel, username, userstate) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().anongiftupgrade;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onGiftUpgrade = (channel, username, sender, userstate) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().giftupgrade;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{gifter}}', 'g'), sender);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onCheer = (channel, userstate, message) => {
    const channelKey = channel.substring(1);
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().cheer;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{amount}}', 'g'), userstate.bits);
            client.say(channel, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onFollow = event => {
    const channelKey = event.broadcaster_user_login;
    ChannelManager.processChannel(channelKey).then(_ => {
        const data = ChannelManager.getChannel(channelKey).getEvents().follow;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), event.user_name);
            client.say(`#${channelKey}`, message);
        }
    }).catch(err => {
        timedLog(`** BOT: ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

// ===================== INIT CHAT BOT =====================

const opts = {
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.OAUTH_TOKEN,
    },
    channels: [
        'MtheB_'
    ],
    connection: {
        reconnect: true,
        secure: true,
    }
};

const client = new tmi.client(opts);

// EVENT HANDLER REGISTRATION
client.on('connected', onConnected);
client.on('chat', onChat);
client.on('hosted', onHost);
client.on('raided', onRaid);
client.on('resub', onResub);
client.on('subgift', onSubGift);
client.on('submysterygift', onSubMysteryGift);
client.on('subscription', onSub);
client.on('paidgiftupgrade', onGiftUpgrade);
client.on('anonpaidgiftupgrade', onAnonGiftUpgrade);
client.on('cheer', onCheer);

client.connect();
new TimerEmitter(client);

// ===================== INIT API SERVER =====================

const actions = {
    refreshChannelData: channelID => {
        DBService.getChannel(channelID).then(channel => {
            if (ChannelManager.getChannel(channel.name) !== undefined) {
                timedLog(`** refreshing data for channel ${channel.name}...`);
                ChannelManager.deleteChannel(channel.name);
                ChannelManager.fetchChannelData(channel.name).then(_ => {
                    timedLog(`** refreshed channel ${channel.name}`);
                }).catch(err => {
                    timedLog(`** ERROR refreshing channel ${channel.name}: ${err}`);
                });
            }
        }).catch(err => {
            timedLog(`** ERROR refreshing channel ${channel.name}: ${err}`);
        });
    },
    joinChannel: channel => {
        return twitchAPI.getUser(channel).then(data => {
            return data ? client.join(data.name) : true;
        });
    },
    leaveChannel: channel => {
        return twitchAPI.getUser(channel).then(data => {
            return data ? client.part(data.name) : true;
        });
    },
    subscribeFollow: channel => {
        return new Promise((resolve, reject) => {
            const condition = {broadcaster_user_id: channel};
            tes.subscribe('channel.follow', condition)
                .then(_ => {
                    resolve()
                })
                .catch(e => {
                    timedLog(`** ERROR subscribing to follow event for channel ${channel}: ${e}`);
                    reject();
                });
        });
    },
    unsubscribeFollow: channel => {
        return new Promise((resolve, reject) => {
            const condition = {broadcaster_user_id: channel};
            tes.unsubscribe('channel.follow', condition)
                .then(_ => {
                    resolve()
                })
                .catch(e => {
                    timedLog(`** ERROR unsubscribing from follow event for channel ${channel}: ${e}`);
                    reject();
                });
        });
    }
}

const server = APIServer(actions);

// ===================== INIT TES =====================

const tesConfig = {
    identity: {
        id: process.env.CLIENT_ID,
        secret: process.env.CLIENT_SECRET
    },
    listener: {
        baseURL: 'https://api.bot.mtheb.tv',
        server: server
    }
}

const tes = new TES(tesConfig);

tes.on('channel.follow', onFollow);