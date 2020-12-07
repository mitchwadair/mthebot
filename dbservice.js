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

    getAllCommandsForChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM commands WHERE channel_id=?`, [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    const data = results.map(c => {
                        return {
                            alias: c.alias,
                            message: c.message,
                            cooldown: c.cooldown,
                            user_level: c.user_level,
                        }
                    });
                    resolve(data);
                }
            });
        });
    }

    getCommandForChannel(alias, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM commands WHERE channel_id=? and alias=?`, [id, alias], (err, results) => {
                if (err) {
                    reject(err);
                } else if (!results.length) {
                    resolve(undefined);
                } else {
                    const data = {
                        alias: results[0].alias,
                        message: results[0].message,
                        cooldown: results[0].cooldown,
                        user_level: results[0].user_level,
                    }
                    resolve(data);
                }
            });
        })
    }

    addCommandForChannel(data, id) {
        return new Promise((resolve, reject) => {
            this.getCommandForChannel(data.alias, id).then(results => {
                if (results) {
                    resolve(undefined);
                } else {
                    this.db.query(
                        `INSERT INTO commands (channel_id, alias, message, cooldown, user_level) VALUES (?, ?, ?, ?, ?)`,
                        [id, data.alias, data.message, data.cooldown, data.user_level],
                        err => {
                            if (err)
                                reject(err)
                            else
                                resolve(data);
                        }
                    );      
                }
            }).catch(err => {
                reject(err);
            })
        });
    }

    updateCommandForChannel(alias, data, id) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `UPDATE commands SET alias=?, message=?, cooldown=?, user_level=? where channel_id=? and alias=?`,
                [data.alias, data.message, data.cooldown, data.user_level, id, alias],
                (err, results) => {
                    if (err)
                        reject(err);
                    else if (!results.affectedRows) 
                        resolve(undefined);
                    else
                        resolve(data);
                });
        });
    }

    deleteCommandForChannel(alias, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`DELETE FROM commands where channel_id=? and alias=?`, [id, alias], (err, results) => {
                if (err)
                    reject(err);
                else if (!results.affectedRows) 
                    resolve(undefined);
                else
                    resolve(true);
            });
        });
    }
}

const instance = new DBService();
module.exports = instance;