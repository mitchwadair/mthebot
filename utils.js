// Copyright (c) 2020-2022 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const fetch = require("node-fetch");

const USER_TYPES = {
    user: 0,
    vip: 1,
    subscriber: 2,
    moderator: 3,
    global_mod: 3,
    broadcaster: 3,
};

module.exports = {
    request: async (url, options, onAuthFailure) => {
        const r = async () => {
            const res = await fetch(url, options);
            if (res.status === 401) {
                const newToken = await onAuthFailure();
                options.header.authorization = `Bearer ${newToken}`;
                return r();
            } else {
                try {
                    // can only read res once, so clone so we can fallback to text
                    return res.clone().json();
                } catch {
                    return res.text();
                }
            }
        };

        return r();
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
        console.log(`** BOT: ${new Date().toUTCString()} ${message}`);
    },
};
