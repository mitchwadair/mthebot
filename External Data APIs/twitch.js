// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const httpsRequest = require('../utils').httpsRequest;
const DBService = require('../dbservice');

let appAccessToken;

const createHeaderObject = token => {
    return {
        'client-id': process.env.CLIENT_ID,
        'Authorization': `Bearer ${token}`
    }
}

const validateToken = token => {
    return new Promise((resolve, reject) => {
        httpsRequest('https://id.twitch.tv/oauth2/validate', {method: 'GET', headers: createHeaderObject(token)}).then(data => {
            if (data.status === 401 && data.message === 'invalid access token')
                reject(data);
            else
                resolve();
        }).catch(err => {
            reject(err);
        });
    });
}

const getTokenForChannel = id => {
    return new Promise((resolve, reject) => {
        DBService.getTokensForChannel(id).then(tokens => {
            validateToken(tokens.access_token).then(_ => {
                resolve(tokens.access_token);
            }).catch(err => {
                if (err.status === 401 && err.message === 'invalid access token') {
                    httpsRequest(
                        `https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${tokens.refresh_token}`,
                        {method: 'POST'}
                    ).then(data => {
                        DBService.updateTokensForChannel(id, data.access_token, data.refresh_token).then(_ => {
                            resolve(data.access_token);
                        }).catch(err => {
                            reject(err);
                        });
                    }).catch(err => {
                        reject(err);
                    });
                } else
                    reject(err);
            });
        });
    })
}

const getAppAccessToken = _ => {
    return new Promise((resolve, reject) => {
        const getNewToken = _ => {
            httpsRequest(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`, {method: 'POST'})
                .then(data => {
                    appAccessToken = data.access_token;
                    resolve(appAccessToken);
                }).catch(err => {
                    reject(err);
                });
        }

        if (appAccessToken) {
            validateToken(appAccessToken).then(isValid => {
                resolve(appAccessToken);
            }).catch(_ => {
                getNewToken();
            });
        } else {
            getNewToken();
        }
    });
}

module.exports = {
    getUser: loginName => {
        return new Promise((resolve, reject) => {
            getAppAccessToken().then(token => {
                httpsRequest(`https://api.twitch.tv/helix/users?login=${loginName}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getAppAccessToken().then(token => {
                let chunks = ids.chunk(100);
                let users = [];
                let promises = [];
                chunks.forEach(chunk => {
                    let queryString = '';
                    chunk.forEach(id => {
                        queryString = `${queryString}id=${id}&`;
                    });
                    promises.push(httpsRequest(`https://api.twitch.tv/helix/users?${queryString}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getAppAccessToken().then(token => {
                httpsRequest(`https://api.twitch.tv/helix/users/follows?from_id=${fromID}&to_id=${toID}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getAppAccessToken().then(token => {
                httpsRequest(`https://api.twitch.tv/helix/users/follows?to_id=${channelID}&first=1`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getTokenForChannel(channelID).then(token => {
                let total = 0;
                const getCountForPage = (page, callback) => {
                    httpsRequest(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${channelID}${page ? `&after=${page}` : ''}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getAppAccessToken().then(token => {
                httpsRequest(`https://api.twitch.tv/helix/streams?user_login=${loginName}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
            getAppAccessToken.then(token => {
                httpsRequest(`https://api.twitch.tv/helix/games?id=${gameID}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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