// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const TimerEmitter = require("../timerEmitter");

class Channel {
    constructor(key, id, commands, events, timers) {
        this.key = key;
        this.id = id;
        this.commands = commands;
        this.events = events;
        this.timers = timers.map((timer, i) => {
            if (timer.enabled) {
                return {
                    interval: setInterval(() => {
                        if (this.timers[i].messageCount >= timer.message_threshold) {
                            this.timers[i].messageCount = 0;
                            TimerEmitter.getInstance().emit(`#${key}`, timer.message);
                        }
                    }, timer.interval * 1000),
                    messageCount: 0,
                };
            }
        });

        return this;
    }

    getKey() {
        return this.key;
    }

    getId() {
        return this.id;
    }

    getCommands() {
        return this.commands;
    }

    getCommand(alias) {
        return this.getCommands().find((cmd) => {
            return cmd.alias == alias;
        });
    }

    getEvents() {
        return this.events;
    }

    getTimers() {
        return this.timers;
    }

    clearTimers() {
        this.timers.forEach((timer) => {
            clearInterval(timer.interval);
        });
    }

    incrementTimers() {
        this.timers.forEach((timer) => {
            timer.messageCount++;
        });
    }
}

module.exports = Channel;
