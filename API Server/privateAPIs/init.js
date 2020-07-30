// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const getArgsFromURL = require('../utils').getArgsFromURL;

const post = (db, actions, req, res) => {
    const defaultEvents = {
        "sub": {
            "enabled": true,
            "message": "{{user}} just subbed with a {{type}} sub!"
        },
        "host": {
            "enabled": true,
            "message": "{{user}} hosted for {{viewers}} viewers!"
        },
        "raid": {
            "enabled": true,
            "message": "{{user}} raided for {{viewers}} viewers!"
        },
        "cheer": {
            "enabled": true,
            "message": "{{user}} just cheered {{amount}} bits!"
        },
        "resub": {
            "enabled": true,
            "message": "{{user}} resubbed for {{months}} months!"
        },
        "subgift": {
            "enabled": true,
            "message": "{{user}} gifted {{recipient}} a sub!"
        },
        "giftupgrade": {
            "enabled": true,
            "message": "{{user}} upgraded their gifted sub from {{gifter}}!"
        },
        "mysterygift": {
            "enabled": true,
            "message": "{{user}} gifted {{count}} subs!"
        },
        "anongiftupgrade": {
            "enabled": true,
            "message": "{{user}} upgraded their gifted sub!"
        }
    }
    const channel = getArgsFromURL(req.url)[0];
    const token = req.headers.authorization.replace('Bearer ', '');
    let query = `INSERT INTO channels (id, name, token, enabled) VALUES (${channel}, "", AES_ENCRYPT("${token}", "${process.env.CLIENT_SECRET}"), true);`;
    let eventsQuery = `INSERT INTO events (channel_id, name, message, enabled) VALUES`
    Object.keys(defaultEvents).forEach((k, i) => {
        eventsQuery = `${eventsQuery} (${channel}, "${k}", "${defaultEvents[k].message}", ${defaultEvents[k].enabled})${i === Object.keys(defaultEvents).length - 1 ? ';' : ','}`
    });
    db.query(query, err => {
        if (err) {
            console.log(err);
            res.writeHead(500);
            res.end(err.toString());
            return;
        }
        db.query(eventsQuery, e => {
            if (e) {
                console.log(e);
                res.writeHead(500);
                res.end(e.toString());
                return;
            }
            actions.joinChannel(channel).then(_ => {
                res.writeHead(200);
                res.end("Channel data created");
            }).catch(err => {
                res.writeHead(500);
                res.end(err.toString());
            });
        });
    });
}

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'POST':
            post(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}