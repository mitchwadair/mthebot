// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const https = require('https');

module.exports = {
    httpsRequest: (url, options) => {
        return new Promise((resolve, reject) => {
            https.request(url, options, res => {
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
                        resolve(data);
                    }
                });
            }).on('error', err => {
                reject(err);
            }).end();
        });
    },
}