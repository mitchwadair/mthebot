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
    },
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
    }
}