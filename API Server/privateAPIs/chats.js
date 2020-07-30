// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const getArgsFromURL = require('../utils').getArgsFromURL;

const get = (db, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    db.query(`SELECT enabled FROM channels WHERE id=?`, [channel], (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(err.toString());
            return;
        } else if (!results.length) {
            res.writeHead(404);
            res.end(`Channel ${channel} not found`);
            return;
        }
        res.writeHead(200);
        res.end(results[0].enabled.toString());
    });
}

const post = (db, actions, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    db.query(`UPDATE channels SET enabled=true WHERE id=?`, [channel], err => {
        if (err) {
            res.writeHead(500);
            res.end(err.toString());
            return;
        }
        actions.joinChannel(channel).then(r => {
            res.writeHead(200);
            res.end(`Bot set to enabled for channel ${channel}`);
        }).catch(err => {
            res.writeHead(500);
            res.end(err.toString());
        });
    });
}

const remove = (db, actions, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    db.query(`UPDATE channels SET enabled=false WHERE id=?`, [channel], err => {
        if (err) {
            res.writeHead(500);
            res.end(err.toString());
            return;
        }
        actions.leaveChannel(channel).then(_ => {
            res.writeHead(200);
            res.end(`Bot set to disabled for channel ${channel}`);
        }).catch(err => {
            res.writeHead(500);
            res.end(err.toString());
        });
    });
}

module.exports = (db, actions, req, res) => {
    switch (req.method) {
        case 'GET':
            get(db, req, res);
            break;
        case 'POST':
            post(db, actions, req, res);
            break;
        case 'DELETE':
            remove(db, actions, req, res);
            break;
        default:
            res.writeHead(400);
            res.end('Bad Request');
    }
}