// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const httpsRequest = require('../utils').httpsRequest;
const DBService = require('../dbservice');
const twitchConfig = require('../config/twitchConfig');

let appAccessToken;

const createHeaderObject = token => {
    return {
        'client-id': process.env.CLIENT_ID,
        'Authorization': `Bearer ${token}`
    }
}

const validateToken = token => {
    return new Promise((resolve, reject) => {
        httpsRequest( twitchConfig.validateToken , {method: 'GET', headers: createHeaderObject(token)}).then(data => {
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
                        `${twitchConfig.getTokenForChannel}${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${tokens.refresh_token}`,
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
            httpsRequest(`${twitchConfig.getAppAccessToken}${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`, {method: 'POST'})
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
                httpsRequest(`${twitchConfig.loginName}${loginName}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
                    promises.push(httpsRequest(`${twitchConfig.getBatchUsersByID}${queryString}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
                httpsRequest(`${twitchConfig.getFollow}${fromID}&to_id=${toID}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
                httpsRequest(`${twitchConfig.getFollow}${channelID}&first=1`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
                httpsRequest(`${twitchConfig.getSubCount}${channelID}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
                    resolve(data.total);
                }).catch(err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getStreamData: loginName => {
        return new Promise((resolve, reject) => {
            getAppAccessToken().then(token => {
                httpsRequest(`${twitchConfig.getStreamData}${loginName}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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
                httpsRequest(`${twitchConfig.getGameName}${gameID}`, {headers: createHeaderObject(token), method: 'GET'}).then(data => {
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