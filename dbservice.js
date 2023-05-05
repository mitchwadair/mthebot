// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const mysql = require("mysql2");
const defaultEvents = require("./defaultEvents.json");

const { DB_HOSTNAME, DB_USERNAME, DB_PASSWORD, DB_PORT, DB_NAME, CLIENT_SECRET } = process.env;

class DBService {
    constructor() {
        if (!DBService._instance) {
            DBService._instance = this;
        }

        this.db = mysql
            .createPool({
                host: DB_HOSTNAME,
                port: DB_PORT,
                user: DB_USERNAME,
                password: DB_PASSWORD,
                database: DB_NAME,
                ssl: { rejectUnauthorized: true },
            })
            .promise();

        return DBService._instance;
    }

    async getUserCount() {
        const [results] = await this.db.execute("SELECT COUNT(*) AS users FROM channels WHERE enabled=1");
        return results[0].users;
    }

    async getEnabledChannels() {
        const [results] = await this.db.execute("SELECT id FROM channels WHERE enabled=1");
        return results.map(({ id }) => id);
    }

    async initChannel(id, name, authToken, refreshToken) {
        const entries = Object.entries(defaultEvents);
        const placeholders = new Array(entries.length).fill("(?, ?, ?, ?)").join(",");
        const values = entries.map(([event, { message, enabled }]) => [id, event, message, enabled]).flat();

        await this.db.execute(
            "INSERT INTO channels (id, name, token, refresh_token, enabled) VALUES (?, ?, AES_ENCRYPT(?, ?), AES_ENCRYPT(?, ?), false)",
            [id, name, authToken, CLIENT_SECRET, refreshToken, CLIENT_SECRET]
        );
        await this.db.execute(`INSERT INTO events (channel_id, name, message, enabled) VALUES ${placeholders}`, values);
    }

    async updateTokensForChannel(id, accessToken, refreshToken) {
        await this.db.execute(
            "UPDATE channels SET token=AES_ENCRYPT(?, ?), refresh_token=AES_ENCRYPT(?, ?) WHERE id=?",
            [accessToken, CLIENT_SECRET, refreshToken, CLIENT_SECRET, id]
        );
    }

    async getTokensForChannel(id) {
        const [results] = await this.db.execute(
            "SELECT AES_DECRYPT(token, ?) as access_token, AES_DECRYPT(refresh_token, ?) as refresh_token FROM channels WHERE id=?",
            [CLIENT_SECRET, CLIENT_SECRET, id]
        );
        return results[0];
    }

    async getChannel(id) {
        const [results] = await this.db.execute("SELECT * FROM channels WHERE id=?", [id]);
        if (results.length) {
            return results[0];
        }
    }

    async updateNameForChannel(name, id) {
        await this.db.execute("UPDATE channels SET name=? WHERE id=?", [name, id]);
    }

    async enableChannel(id) {
        await this.db.execute("UPDATE channels SET enabled=true WHERE id=?", [id]);
    }

    async disableChannel(id) {
        await this.db.execute("UPDATE channels SET enabled=false WHERE id=?", [id]);
    }

    async getAllCommandsForChannel(id) {
        const [results] = await this.db.execute(
            "SELECT alias,message,cooldown,user_level FROM commands WHERE channel_id=?",
            [id]
        );
        return results;
    }

    async getCommandForChannel(alias, id) {
        const [results] = await this.db.execute(
            "SELECT alias,message,cooldown,user_level FROM commands WHERE channel_id=? and alias=?",
            [id, alias]
        );
        if (results.length) {
            return results[0];
        }
    }

    async addCommandForChannel(data, id) {
        const existing = await this.getCommandForChannel(data.alias, id);
        if (!existing) {
            await this.db.execute(
                "INSERT INTO commands (channel_id, alias, message, cooldown, user_level) VALUES (?, ?, ?, ?, ?)",
                [id, data.alias, data.message, data.cooldown, data.user_level]
            );
            return data;
        }
    }

    async updateCommandForChannel(alias, data, id) {
        const [result] = await this.db.execute(
            "UPDATE commands SET alias=?, message=?, cooldown=?, user_level=? where channel_id=? and alias=?",
            [data.alias, data.message, data.cooldown, data.user_level, id, alias]
        );
        if (result.affectedRows > 0) {
            return data;
        }
    }

    async deleteCommandForChannel(alias, id) {
        const [result] = await this.db.execute("DELETE FROM commands where channel_id=? and alias=?", [id, alias]);
        if (result.affectedRows > 0) {
            return true;
        }
    }

    async getAllEventsForChannel(id) {
        const [results] = await this.db.execute("SELECT name,message,enabled FROM events WHERE channel_id=?", [id]);
        return results.map((event) => {
            return { ...event, enabled: Boolean(event.enabled) };
        });
    }

    async getEventForChannel(name, id) {
        const [results] = await this.db.execute(
            "SELECT name,message,enabled FROM events WHERE channel_id=? and name=?",
            [id, name]
        );
        if (results.length) {
            const { name, message, enabled } = results[0];
            return { name, message, enabled: Boolean(enabled) };
        }
    }

    async updateEventForChannel(name, data, id) {
        const [result] = await this.db.execute(
            "UPDATE events SET name=?, message=?, enabled=? where channel_id=? and name=?",
            [name, data.message, data.enabled, id, name]
        );
        if (result.affectedRows > 0) {
            return { name, ...data };
        }
    }

    async getAllTimersForChannel(id) {
        const [results] = await this.db.execute(
            "SELECT name,message,enabled,`interval`,message_threshold FROM timers WHERE channel_id=?",
            [id]
        );
        return results.map((timer) => {
            return { ...timer, enabled: Boolean(timer.enabled) };
        });
    }

    async getTimerForChannel(name, id) {
        const [results] = await this.db.execute(
            "SELECT name,message,enabled,`interval`,message_threshold FROM timers WHERE channel_id=? and name=?",
            [id, name]
        );
        if (results.length) {
            const timer = results[0];
            return { ...timer, enabled: Boolean(timer.enabled) };
        }
    }

    async addTimerForChannel(data, id) {
        const { name, enabled, message, interval, message_threshold } = data;
        const existing = await this.getTimerForChannel(name, id);
        if (!existing) {
            await this.db.execute(
                "INSERT INTO timers (channel_id, name, enabled, message, `interval`, message_threshold) VALUES (?, ?, ?, ?, ?, ?)",
                [id, name, enabled, message, interval, message_threshold]
            );
            return data;
        }
    }

    async updateTimerForChannel(name, data, id) {
        const { name: newName, enabled, message, interval, message_threshold } = data;
        const [result] = await this.db.execute(
            "UPDATE timers SET name=?, enabled=?, message=?, `interval`=?, message_threshold=? where channel_id=? and name=?",
            [newName, enabled, message, interval, message_threshold, id, name]
        );
        if (result.affectedRows > 0) {
            return data;
        }
    }

    async deleteTimerForChannel(name, id) {
        const [result] = await this.db.execute("DELETE FROM timers where channel_id=? and name=?", [id, name]);
        if (result.affectedRows > 0) {
            return true;
        }
    }
}

const instance = new DBService();
module.exports = instance;
