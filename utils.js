// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const https = require('https');

module.exports = {
    validateData: (schema, data) => {
        const diffKeys = (exp, act) => {
            let k1 = Object.keys(exp);
            let k2 = Object.keys(act);
            let diffExp = k1.filter(k => !k2.includes(k));
            let diffAct = k2.filter(k => !k1.includes(k));
            let ret = {}
            if (diffExp.length) ret.missingKeys = diffExp;
            if (diffAct.length) ret.extraKeys = diffAct;
            return ret;
        }
        let e = diffKeys(schema, data);
        if (e.missing || e.extra) {
            return e;
        }
        Object.keys(schema).forEach(k => {
            let exp = schema[k];
            let act = typeof data[k];
            if (exp != act) {
                e[k] = `Expected type ${exp} but was actually ${act}`;
            }
        });
        if (Object.keys(e).length) {
            return e;
        }
        return true;
    },
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
                        reject(data);
                    } else {
                        resolve(data);
                    }
                });
            }).on('error', err => {
                reject(err);
            }).end();
        });
    },
    timedLog: message => {
        console.log(`${new Date(Date.now()).toUTCString()} ${message}`);
    }
}