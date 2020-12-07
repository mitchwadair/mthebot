// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const mysql = require('mysql');
const {timedLog} = require('./utils');

class DBService {
    constructor() {
        if (!DBService._instance) {
            DBService._instance = this;
        }

        this.db = mysql.createConnection({
            host: process.env.RDS_HOSTNAME,
            user: process.env.RDS_USERNAME,
            password: process.env.RDS_PASSWORD,
            port: process.env.RDS_PORT,
            database: process.env.RDS_DB_NAME
        });
    
        this.db.connect(err => {
            if (err) {
                console.error(`** DB Connection failed: ${err.stack}`);
                return;
            }
            timedLog(`** Connected to DB`);
        });

        return DBService._instance;
    }

    getChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query('SELECT * FROM channels WHERE id=?', [id], (err, results) => {
                if (err) {
                    reject(err)
                } else if (!results.length) {
                    resolve(undefined);
                }
                resolve(results[0]);
            });
        });
    }

    enableChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`UPDATE channels SET enabled=true WHERE id=?`, [id], err => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    disableChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`UPDATE channels SET enabled=false WHERE id=?`, [id], err => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

}

const instance = new DBService();
module.exports = instance;