// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const httpsRequest = require('./utils').httpsRequest;

let headers = {
    'Client-ID': process.env.CLIENT_ID,
}

let hasValidToken = false;

const refreshAppToken = _ => {
    return new Promise((resolve, reject) => {
        if (hasValidToken) {
            resolve();
        } else {
            httpsRequest(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`, {method: 'POST'})
            .then(data => {
                headers['Authorization'] = `Bearer ${data.access_token}`;
                hasValidToken = true;
                setTimeout(_ => {hasValidToken = false}, data.expires_in);
                resolve();
            }).catch(err => {
                reject(err);
            });
        }
    });
}

module.exports = {
    getUser: loginName => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                httpsRequest(`https://api.twitch.tv/helix/users?login=${loginName}`, {headers: headers, method: 'GET'}).then(data => {
                    resolve(data.data[0]);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getBatchUsersByID: ids => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                let chunks = ids.chunk(100);
                let users = [];
                let promises = [];
                chunks.forEach(chunk => {
                    let queryString = '';
                    chunk.forEach(id => {
                        queryString = `${queryString}id=${id}&`;
                    });
                    promises.push(httpsRequest(`https://api.twitch.tv/helix/users?${queryString}`, {headers: headers, method: 'GET'}).then(data => {
                        data.data.forEach(user => {
                            users.push({id: user.id, name: user.login});
                        });
                    }));
                });
                Promise.allSettled(promises).then(_ => {
                    resolve(users);
                })
            });
        });
    },
    getFollowData: (fromID, toID) => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                httpsRequest(`https://api.twitch.tv/helix/users/follows?from_id=${fromID}&to_id=${toID}`, {headers: headers, method: 'GET'}).then(data => {
                    resolve(data.data[0]);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getFollowCount: channelID => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                httpsRequest(`https://api.twitch.tv/helix/users/follows?to_id=${channelID}&first=1`, {headers: headers, method: 'GET'}).then(data => {
                    resolve(data.total);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getSubCount: channelID => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                let total = 0;
                const getCountForPage = (page, callback) => {
                    httpsRequest(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${channelID}${page ? `&after=${page}` : ''}`, {headers: headers, method: 'GET'}).then(data => {
                        total += data.data.length;
                        if (data.data.length < 100) {
                            callback();
                        } else {
                            getCountForPage(data.pagination.cursor, callback);
                        }
                    }).catch(err => {
                        reject(err);
                    });
                }
                getCountForPage(null, _ => {resolve(total - 1)}); //subtract 1 because it counts broadcaster as 1
            }).catch(err => {
                reject(err);
            });
        });
    },
    getStreamData: loginName => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                httpsRequest(`https://api.twitch.tv/helix/streams?user_login=${loginName}`, {headers: headers, method: 'GET'}).then(data => {
                    resolve(data.data[0]);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            })
        });
    },
    getGameName: gameID => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                httpsRequest(`https://api.twitch.tv/helix/games?id=${gameID}`, {headers: headers, method: 'GET'}).then(data => {
                    resolve(data.data[0].name);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            })
        });
    }
}