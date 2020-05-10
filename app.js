// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

require('dotenv').config();
const tmi = require('tmi.js');
const mysql = require('mysql');
const APIServer = require('./API Server/apiserver');

// ===================== DATA =====================

let channels = {};

const USER_TYPES = {
    user: 0,
    vip: 1,
    subscriber: 2,
    moderator: 3,
    global_mod: 3,
    broadcaster: 3,
}

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

// remove a channel from the active channels object
const deleteChannel = channel => {
    // clear intervals for timed messages
    if (channels[channel]) {
        channels[channel].timers.forEach(timer => {
            clearInterval(timer.interval);
        });
        delete channels[channel];
        console.log(`** removed channel ${channel} from active channels`);
    }
}

// get channel data from DB
const fetchChannelData = channelKey => {
    return new Promise((resolve, reject) => {
        db.query(`SELECT commands,events,timers FROM channels WHERE name='${channelKey}'`, (err, results) => {
            if (err) {
                return reject(err);
            } else {
                const timers = JSON.parse(results[0].timers);
                channels[channelKey] = {
                    commands: JSON.parse(results[0].commands),
                    events: JSON.parse(results[0].events),
                    timeout: setTimeout(_ => {deleteChannel(channelKey)}, 300000),
                    timers: Object.keys(timers).map((key, i) => {
                        if (timers[key].enabled) {
                            return {
                                interval: setInterval(_ => {
                                    if (channels[channelKey].timers[i].messageCount >= timers[key].messageThreshold) {
                                        channels[channelKey].timers[i].messageCount = 0;
                                        client.say(`#${channelKey}`, timers[key].message);
                                    }
                                }, timers[key].seconds*1000),
                                messageCount: 0,
                            }
                        }
                    }),
                }
                console.log(`** fetched data for channel ${channelKey}`);
                resolve()
            }
        });
    });
}

// process the given channel
// either restart the timeout func or add the channel to active channels
const processChannel = channelKey => {
    return new Promise((resolve, reject) => {
        if (channels[channelKey] !== undefined) {
            clearTimeout(channels[channelKey].timeout);
            channels[channelKey].timeout = setTimeout(_ => {deleteChannel(channelKey)}, 300000);
            resolve();
        } else {
            fetchChannelData(channelKey).then(_ => {
                console.log(`** added channel ${channelKey} to active channels`);
                resolve();
            }).catch(err => {
                reject(err);
            })
        }
    });
}

const getUserLevel = (userstate) => {
    return userstate['badges-raw'].split(',').map(badge => {
        return badge.split('/')[0];
    }).reduce((total, badge) => {
        if (USER_TYPES[badge] && USER_TYPES[badge] > total) {
            return USER_TYPES[badge];
        }
        return total;
    }, USER_TYPES.user);
}

// ===================== EVENT HANDLERS =====================

const onConnected = (address, port) => {
    console.log(`** MtheBot_ connected to ${address}:${port}`);
    console.log('** joining all serviced channels...');
    db.query("SELECT name,enabled from channels", (err, results, fields) => {
        let promises = results.map(res => {
            if (!res.enabled) return;
            return client.join(res.name);
        });
        Promise.all(promises).then(_ => {
            console.log('** all serviced channels have been joined');
        }).catch(err => {
            console.log(`** ERROR JOINING CHANNEL: ${err}`);
        });
    });
}

const onChat = (channel, userstate, message, self) => {
    if (self) return;

    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        channels[channelKey].timers.forEach(timer => {
            timer.messageCount++
        });
        const full = message.trim();

        if (full.startsWith('!')) {
            const userLevel = getUserLevel(userstate);
            const args = full.split(' ');
            const command = channels[channelKey].commands[args.shift().substring(1)];
            if (command && !command.isOnCooldown && userLevel >= command.userLevel) {
                command.isOnCooldown = true;
                setTimeout(_ => {command.isOnCooldown = false}, command.cooldown * 1000);
                let message = command.message
                    .replace(new RegExp('{{sender}}', 'g'), userstate['display-name']);
                client.say(channel, message);
            }
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onHost = (channel, username, viewers, autohost) => {
    if (!autohost) {
        const channelKey = channel.substring(1);
        processChannel(channelKey).then(_ => {
            const data = channels[channelKey].events.host;
            if (data.enabled) {
                let message = data.message
                    .replace(new RegExp('{{user}}', 'g'), username)
                    .replace(new RegExp('{{viewers}}', 'g'), viewers);
                client.say(channel, message);
            }
        }).catch(err => {
            console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
        });
    }
}

const onRaid = (channel, username, viewers) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.raid;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{viewers}}', 'g'), viewers);
            client.say(channel, message);
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onResub = (channel, username, monthStreak, message, userstate, methods) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.resub;
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
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSubGift = (channel, username, monthStreak, recipient, methods, userstate) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.subgift;
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
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSubMysteryGift = (channel, username, numbOfSubs, methods, userstate) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.mysterygift;
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
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onSub = (channel, username, methods, message, userstate) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.sub;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{type}}', 'g'), methods.planName);
            client.say(channel, message);
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onAnonGiftUpgrade = (channel, username, userstate) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.anongiftupgrade;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username);
            client.say(channel, message);
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onGiftUpgrade = (channel, username, sender, userstate) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.giftupgrade;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{gifter}}', 'g'), sender);
            client.say(channel, message);
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

const onCheer = (channel, userstate, message) => {
    const channelKey = channel.substring(1);
    processChannel(channelKey).then(_ => {
        const data = channels[channelKey].events.cheer;
        if (data.enabled) {
            let message = data.message
                .replace(new RegExp('{{user}}', 'g'), username)
                .replace(new RegExp('{{amount}}', 'g'), userstate.bits);
            client.say(channel, message);
        }
    }).catch(err => {
        console.log(`** ERROR ON CHANNEL ${channelKey}: ${err}`);
    });
}

// ===================== INIT CHAT BOT/DB CONNECTION =====================

const opts = {
    identity: {
        username: 'MtheBot_',
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

const db = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
    database: process.env.RDS_DB_NAME
});

db.connect(err => {
    if (err) {
        console.error(`** DB Connection failed: ${err.stack}`);
        return;
    }
    console.log('** Connected to DB');
});

// ===================== INIT API SERVER =====================

const actions = {
    refreshChannelData: channel => {
        if (channels[channel] !== undefined) {
            deleteChannel(channel);
            fetchChannelData(channel).then(_ => {
                console.log(`** refreshed channel ${channel}`);
            }).catch(err => {
                console.log(`** ERROR refreshing channel ${channel}: ${err}`);
            })
        }
    },
    joinChannel: channel => {
        return client.join(channel);
    },
    leaveChannel: channel => {
        return client.part(channel);
    }
}

APIServer(db, actions);