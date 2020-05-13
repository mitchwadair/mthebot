const url = require('url');
const getChannelFromURL = require('../utils').getChannelFromURL;

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
    const channel = getChannelFromURL(req.url);
    let query = `INSERT INTO channels VALUES ("${channel}", true, "[]", ${db.escape(JSON.stringify(defaultEvents))}, "[]");`;
    db.query(query, err => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        }
        actions.joinChannel(channel).then(_ => {
            res.writeHead(200);
            res.end();
        }).catch(err => {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
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