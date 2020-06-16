// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const getArgsFromURL = require('../utils').getArgsFromURL;

const get = (db, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    db.query(`SELECT enabled FROM channels WHERE name=?`, [channel], (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
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
    db.query(`UPDATE channels SET enabled=true WHERE name=?`, [channel], err => {
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

const remove = (db, actions, req, res) => {
    const channel = getArgsFromURL(req.url)[0];
    db.query(`UPDATE channels SET enabled=false WHERE name=?`, [channel], err => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        }
        actions.leaveChannel(channel).then(_ => {
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