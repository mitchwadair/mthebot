// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const mysql = require("mysql2");
const defaultEvents = require("./defaultEvents.json");

class DBService {
    constructor() {
        if (!DBService._instance) {
            DBService._instance = this;
        }

        const { RDS_HOSTNAME, RDS_USERNAME, RDS_PASSWORD, RDS_PORT, RDS_DB_NAME } = process.env;

        this.db = mysql.createPool({
            host: RDS_HOSTNAME,
            user: RDS_USERNAME,
            password: RDS_PASSWORD,
            port: RDS_PORT,
            database: RDS_DB_NAME,
        });

        return DBService._instance;
    }

    getUserCount() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT COUNT(*) AS users FROM channels WHERE enabled=1", (err, results) => {
                if (err) reject(err);
                else resolve(results[0].users);
            });
        });
    }

    getEnabledChannels() {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT id FROM channels WHERE enabled=1", (err, results) => {
                if (err) reject(err);
                else resolve(results.map((r) => r.id));
            });
        });
    }

    initChannel(id, name, authToken, refreshToken) {
        return new Promise((resolve, reject) => {
            let query = `INSERT INTO channels (id, name, token, refresh_token, enabled) VALUES (${id}, "${name}", AES_ENCRYPT("${authToken}", "${process.env.CLIENT_SECRET}"), AES_ENCRYPT("${refreshToken}", "${process.env.CLIENT_SECRET}"), false);`;
            let eventsQuery = `INSERT INTO events (channel_id, name, message, enabled) VALUES`;
            Object.keys(defaultEvents).forEach((k, i) => {
                eventsQuery = `${eventsQuery} (${id}, "${k}", "${defaultEvents[k].message}", ${
                    defaultEvents[k].enabled
                })${i === Object.keys(defaultEvents).length - 1 ? ";" : ","}`;
            });
            this.db.query(query, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.db.query(eventsQuery, (e) => {
                        if (e) {
                            reject(e);
                        } else {
                            resolve(true);
                        }
                    });
                }
            });
        });
    }

    updateTokensForChannel(id, accessToken, refreshToken) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `UPDATE channels SET token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}'), refresh_token=AES_ENCRYPT(?, '${process.env.CLIENT_SECRET}') WHERE id=?`,
                [accessToken, refreshToken, id],
                (err) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }

    getTokensForChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `SELECT AES_DECRYPT(token, '${process.env.CLIENT_SECRET}') as access_token, AES_DECRYPT(refresh_token, '${process.env.CLIENT_SECRET}') as refresh_token FROM channels WHERE id=?`,
                [id],
                (err, results) => {
                    if (err) reject(err);
                    else {
                        const data = {
                            access_token: results[0].access_token.toString(),
                            refresh_token: results[0].refresh_token.toString(),
                        };
                        resolve(data);
                    }
                }
            );
        });
    }

    getChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query("SELECT * FROM channels WHERE id=?", [id], (err, results) => {
                if (err) {
                    reject(err);
                } else if (!results.length) {
                    resolve(undefined);
                }
                resolve(results[0]);
            });
        });
    }

    updateNameForChannel(name, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`UPDATE channels SET name=? WHERE id=?`, [name, id], (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    enableChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`UPDATE channels SET enabled=true WHERE id=?`, [id], (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
    }

    disableChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`UPDATE channels SET enabled=false WHERE id=?`, [id], (err) => {
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
                    const data = results.map((c) => {
                        return {
                            alias: c.alias,
                            message: c.message,
                            cooldown: c.cooldown,
                            user_level: c.user_level,
                        };
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
                    };
                    resolve(data);
                }
            });
        });
    }

    addCommandForChannel(data, id) {
        return new Promise((resolve, reject) => {
            this.getCommandForChannel(data.alias, id)
                .then((results) => {
                    if (results) {
                        resolve(undefined);
                    } else {
                        this.db.query(
                            `INSERT INTO commands (channel_id, alias, message, cooldown, user_level) VALUES (?, ?, ?, ?, ?)`,
                            [id, data.alias, data.message, data.cooldown, data.user_level],
                            (err) => {
                                if (err) reject(err);
                                else resolve(data);
                            }
                        );
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    updateCommandForChannel(alias, data, id) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `UPDATE commands SET alias=?, message=?, cooldown=?, user_level=? where channel_id=? and alias=?`,
                [data.alias, data.message, data.cooldown, data.user_level, id, alias],
                (err, results) => {
                    if (err) reject(err);
                    else if (!results.affectedRows) resolve(undefined);
                    else resolve(data);
                }
            );
        });
    }

    deleteCommandForChannel(alias, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`DELETE FROM commands where channel_id=? and alias=?`, [id, alias], (err, results) => {
                if (err) reject(err);
                else if (!results.affectedRows) resolve(undefined);
                else resolve(true);
            });
        });
    }

    getAllEventsForChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM events WHERE channel_id=?`, [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    const data = results.map((c) => {
                        return {
                            name: c.name,
                            message: c.message,
                            enabled: c.enabled ? true : false,
                        };
                    });
                    resolve(data);
                }
            });
        });
    }

    getEventForChannel(name, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM events WHERE channel_id=? and name=?`, [id, name], (err, results) => {
                if (err) {
                    reject(err);
                } else if (!results.length) {
                    resolve(undefined);
                } else {
                    const data = {
                        name: results[0].name,
                        message: results[0].message,
                        enabled: results[0].enabled ? true : false,
                    };
                    resolve(data);
                }
            });
        });
    }

    updateEventForChannel(name, data, id) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `UPDATE events SET name=?, message=?, enabled=? where channel_id=? and name=?`,
                [name, data.message, data.enabled, id, name],
                (err, results) => {
                    if (err) reject(err);
                    else if (!results.affectedRows) resolve(undefined);
                    else resolve(data);
                }
            );
        });
    }

    getAllTimersForChannel(id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM timers WHERE channel_id=?`, [id], (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    const data = results.map((c) => {
                        return {
                            name: c.name,
                            message: c.message,
                            enabled: c.enabled ? true : false,
                            interval: c.interval,
                            message_threshold: c.message_threshold,
                        };
                    });
                    resolve(data);
                }
            });
        });
    }

    getTimerForChannel(name, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`SELECT * FROM timers WHERE channel_id=? and name=?`, [id, name], (err, results) => {
                if (err) {
                    reject(err);
                } else if (!results.length) {
                    resolve(undefined);
                } else {
                    const data = {
                        name: results[0].name,
                        message: results[0].message,
                        enabled: results[0].enabled ? true : false,
                        interval: results[0].interval,
                        message_threshold: results[0].message_threshold,
                    };
                    resolve(data);
                }
            });
        });
    }

    addTimerForChannel(data, id) {
        return new Promise((resolve, reject) => {
            this.getTimerForChannel(data.name, id)
                .then((results) => {
                    if (results) {
                        resolve(undefined);
                    } else {
                        this.db.query(
                            `INSERT INTO timers (channel_id, name, enabled, message, \`interval\`, message_threshold) VALUES (?, ?, ?, ?, ?, ?)`,
                            [id, data.name, data.enabled, data.message, data.interval, data.message_threshold],
                            (err) => {
                                if (err) reject(err);
                                else resolve(data);
                            }
                        );
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    updateTimerForChannel(name, data, id) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `UPDATE timers SET name=?, enabled=?, message=?, \`interval\`=?, message_threshold=? where channel_id=? and name=?`,
                [data.name, data.enabled, data.message, data.interval, data.message_threshold, id, name],
                (err, results) => {
                    if (err) reject(err);
                    else if (!results.affectedRows) resolve(undefined);
                    else resolve(data);
                }
            );
        });
    }

    deleteTimerForChannel(name, id) {
        return new Promise((resolve, reject) => {
            this.db.query(`DELETE FROM timers where channel_id=? and name=?`, [id, name], (err, results) => {
                if (err) reject(err);
                else if (!results.affectedRows) resolve(undefined);
                else resolve(true);
            });
        });
    }
}

const instance = new DBService();
module.exports = instance;
