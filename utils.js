// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const https = require("https");

const USER_TYPES = {
    user: 0,
    vip: 1,
    subscriber: 2,
    moderator: 3,
    global_mod: 3,
    broadcaster: 3,
};

module.exports = {
    httpsRequest: (url, options) => {
        return new Promise((resolve, reject) => {
            https
                .request(url, options, (res) => {
                    let data = [];
                    res.on("error", (err) => {
                        reject(err);
                    })
                        .on("data", (chunk) => {
                            data.push(chunk);
                        })
                        .on("end", () => {
                            data = JSON.parse(Buffer.concat(data).toString());
                            if (data.error) {
                                reject(data);
                            } else {
                                resolve(data);
                            }
                        });
                })
                .on("error", (err) => {
                    reject(err);
                })
                .end();
        });
    },
    getLengthDataFromMillis: (ms) => {
        const date = new Date(ms);
        return {
            years: date.getUTCFullYear() - 1970,
            months: date.getUTCMonth(),
            days: date.getUTCDate() - 1,
            hours: date.getUTCHours(),
            minutes: date.getUTCMinutes(),
            seconds: date.getUTCSeconds(),
        };
    },
    getUserLevel: (userstate) => {
        return userstate["badges-raw"]
            ? userstate["badges-raw"]
                  .split(",")
                  .map((badge) => {
                      return badge.split("/")[0];
                  })
                  .reduce((total, badge) => {
                      if (USER_TYPES[badge] && USER_TYPES[badge] > total) {
                          return USER_TYPES[badge];
                      }
                      return total;
                  }, USER_TYPES.user)
            : 0;
    },
    timedLog: (message) => {
        console.log(`${new Date(Date.now()).toUTCString()} ${message}`);
    },
};
