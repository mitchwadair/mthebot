// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const WebSocket = require('ws');

const timedLog = message => {
    console.log(`${new Date(Date.now()).toUTCString()} ${message}`);
}

const initConnectionData = (c, topics) => {
    c.socket.on('open', _ => {
        timedLog(`** PUBSUB: Connection made`);
        heartbeat(c);
        c.topics.forEach((topic, i) => {
            setTimeout(_ => {
                timedLog(`** PUBSUB: Subscribing to topic ${topic.topics[0]}`);
                c.socket.send(JSON.stringify({
                    type: 'LISTEN',
                    data: {
                        topics: topic.topics,
                        auth_token: topic.auth,
                    }
                }));
            }, i);
        });
    });

    c.socket.on('message', m => {
        const obj = JSON.parse(m);
        switch (obj.type) {
            case 'RESPONSE':
                if (obj.error.length) {
                    timedLog(`** PUBSUB: Error response: ${obj.error}`);
                }
                break;
            case 'PONG': 
                timedLog(`** PUBSUB: PONG recieved`);
                c.connectionManager.isPinging = false;
                break;
            case 'RECONNECT':
                timedLog(`** PUBSUB: Reconnecting to PubSub...`);
                c.socket.terminate();
                c.socket = new WebSocket('wss://pubsub-edge.twitch.tv');
                initConnectionData(c);
                break;
            case 'MESSAGE':
                c.topics.find(topic => topic.topics.includes(obj.data.topic)).handler(JSON.parse(obj.data.message));
                break;
            default:
                timedLog(`** PUBSUB: Unhandled socket message type`);
                break;
        }
    });
}

const heartbeat = connection => {
    timedLog(`** PUBSUB: PINGing for connection ${PubSub._instance._connections.indexOf(connection)}...`);
    connection.connectionManager.isPinging = true;
    connection.socket.send(JSON.stringify({type: 'PING'}));
    setTimeout(_ => {
        if (connection.connectionManager.isPinging) {
            timedLog(`** PUBSUB: PONG not recieved in time. Reconnecting to PubSub...`);
            connection.socket = new WebSocket('wss://pubsub-edge.twitch.tv');
            initConnectionData(connection);
        }
    }, 10000);
}

function PubSub() {
    //construct singleton instance of PubSub
    if (PubSub._instance) {
        return PubSub._instance;
    }
    if (!(this instanceof PubSub)) {
        return new PubSub();
    }
    PubSub._instance = this;

    this._connections = [];
}

PubSub.prototype.subscribe = function(channelId, topic, auth, handler) {
    const topicData = {
        topics: [`${topic}.${channelId}`],
        auth: auth,
        handler: handler,
    }
    
    const generateNewConnection = _ => {
        let conn = {
            socket: new WebSocket('wss://pubsub-edge.twitch.tv'),
            topics: [topicData],
            connectionManager: {
                interval: null,
                isPinging: false,
            }
        }
        conn.connectionManager.interval = setInterval(_ => {heartbeat(conn)}, 270000 + Math.floor(Math.random() * 100));
        initConnectionData(conn);
        this._connections.push(conn);
    }
    
    if (!this._connections.length) {
        generateNewConnection();
    } else {
        let connectionToAddTo = this._connections.find(c => c.topics.length < 50);
        if (connectionToAddTo) {
            connectionToAddTo.topics.push(topicData);
            connectionToAddTo.socket.send(JSON.stringify({
                type: 'LISTEN',
                data: {
                    topics: topicData.topics,
                    auth_token: auth,
                }
            }));
        } else {
            generateNewConnection();
        }
    }
}

PubSub.prototype.unsubscribe = function(channelId, topic, auth) {
    const topicString = `${topic}.${channelId}`;
    let connectionToRemoveFrom = this._connections.find(c => c.topics.find(t => t.topics.includes(topicString)) !== undefined);
    timedLog(`** PUBSUB: Unsubscribing from topic ${topicString}`);
    connectionToRemoveFrom.socket.send(JSON.stringify({
        type: 'UNLISTEN',
        data: {
            topics: [topicString],
        }
    }));
    connectionToRemoveFrom.topics = connectionToRemoveFrom.topics.filter(t => !t.topics.includes(topicString));
    //if there are no more topics on this connection, terminate the connection and clean it up, then remove from connections array
    if (!connectionToRemoveFrom.topics.length) {
        connectionToRemoveFrom.socket.terminate();
        clearInterval(connectionToRemoveFrom.connectionManager.interval);
        this._connections = this._connections.filter(c => !c === connectionToRemoveFrom);
    }
}

module.exports = PubSub;