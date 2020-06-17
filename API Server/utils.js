// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');

module.exports = {
    getArgsFromURL: _url => {
        let args = url.parse(_url).pathname.split('/');
        args.splice(0, 2);
        return args;
    },
    channelExistsInDB: (db, channel) => {
        return new Promise((resolve, reject) => {
            db.query(`SELECT NULL FROM channels WHERE name=?`, [channel], (err, results) => {
                if (err) {
                    reject(err)
                } else if (!results.length) {
                    reject('not found');
                }
                resolve(true);
            });
        });
    }
}