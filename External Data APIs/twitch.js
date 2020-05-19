const https = require('https');

let headers = {
    'Client-ID': process.env.CLIENT_ID,
}

let hasValidToken = false;

const refreshAppToken = _ => {
    return new Promise((resolve, reject) => {
        if (hasValidToken) {
            resolve();
        } else {
            https.request(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`, {method: 'POST'}, res => {
                let data = []
                res.on('error', err => {
                    reject(err);
                }).on('data', chunk => {
                    data.push(chunk);
                }).on('end', _ => {
                    data = JSON.parse(Buffer.concat(data).toString());
                    console.log(data);
                    if (data.error) {
                        reject(data.error);
                    } else {
                        console.log(data.access_token);
                        headers['Authorization'] = `Bearer ${data.access_token}`;
                        hasValidToken = true;
                        setTimeout(_ => {hasValidToken = false}, data.expires_in);
                        resolve();
                    }
                });
            }).on('error', err => {
                reject(err);
            }).end();
        }
    });
}

module.exports = {
    getUser: loginName => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                https.get(`https://api.twitch.tv/helix/users?login=${loginName}`, {headers: headers}, res => {
                    let data = []
                    res.on('error', err => {
                        reject(err);
                    }).on('data', chunk => {
                        data.push(chunk);
                    }).on('end', _ => {
                        data = JSON.parse(Buffer.concat(data).toString());
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data.data[0]);
                        }
                    });
                }).on('error', err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getFollowData: (fromID, toID) => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                https.get(`https://api.twitch.tv/helix/users/follows?from_id=${fromID}&to_id=${toID}`, {headers: headers}, res => {
                    let data = []
                    res.on('error', err => {
                        reject(err);
                    }).on('data', chunk => {
                        data.push(chunk);
                    }).on('end', _ => {
                        data = JSON.parse(Buffer.concat(data).toString());
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data.data[0]);
                        }
                    });
                }).on('error', err => {
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
                https.get(`https://api.twitch.tv/helix/users/follows?to_id=${channelID}&first=1`, {headers: headers}, res => {
                    let data = []
                    res.on('error', err => {
                        reject(err);
                    }).on('data', chunk => {
                        data.push(chunk);
                    }).on('end', _ => {
                        data = JSON.parse(Buffer.concat(data).toString());
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data.total);
                        }
                    });
                }).on('error', err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            });
        });
    },
    getStreamData: loginName => {
        return new Promise((resolve, reject) => {
            refreshAppToken().then(_ => {
                https.get(`https://api.twitch.tv/helix/streams?user_login=${loginName}`, {headers: headers}, res => {
                    let data = []
                    res.on('error', err => {
                        reject(err);
                    }).on('data', chunk => {
                        data.push(chunk);
                    }).on('end', _ => {
                        data = JSON.parse(Buffer.concat(data).toString());
                        console.log(headers);
                        console.log(data);
                        if (data.error) {
                            reject(data.error);
                        } else {
                            resolve(data.data[0]);
                        }
                    });
                }).on('error', err => {
                    reject(err);
                });
            }).catch(err => {
                reject(err);
            })
        });
    }
}