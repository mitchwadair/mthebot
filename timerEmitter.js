// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

class TimerEmitter {
    constructor(tmiClient) {
        if (TimerEmitter._instance)
            return TimerEmitter._instance;

        if (!(this instanceof TimerEmitter))
            return new TimerEmitter(tmiClient);

        TimerEmitter._instance = this;

        this.tmiClient = tmiClient;
    }

    static getInstance() {
        return TimerEmitter._instance;
    }

    emit(channel, message) {
        this.tmiClient.say(channel, message);
    }
}

module.exports = TimerEmitter;