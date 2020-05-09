// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');

const getChannelFromURL = _url => {
    return url.parse(_url).pathname.split('/')[2];
}

const get = (db, req, res) => {
    const channel = getChannelFromURL(req.url);
    db.query(`SELECT commands FROM channels WEHRE name=?`, [channel], (err, results) => {
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
        res.end(results[0].commands);
    });
}

const post = (db, actions, req, res) => {
    const channel = getChannelFromURL(req.url);
    let body = [];
    req.on('error', err => {
        res.writeHead(500);
        res.end(`ERROR: ${err}`);
    }).on('data', chunk => {
        body.push(chunk);
    }).on('end', _ => {
        body = Buffer.concat(body).toString();
        db.query(`UPDATE channels SET commands=? WHERE name=?`, [body,channel], err => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            }
            res.writeHead(200);
            res.end();
        });
    });
}

const remove = (db, actions, req, res) => {
    const channel = getChannelFromURL(req.url);
    const command = url.parse(req.url).pathname.split('/')[3];
    db.query(`SELECT commands FROM channels WHERE name=?`, [channel], (err, results) => {
        console.log(results);
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        } else if (!results.length) {
            res.writeHead(404);
            res.end(`Channel ${channel} not found`);
            return;
        }
        let commands = JSON.parse(results[0].commands);
        if (!Object.keys(commands).includes(command)) {
            res.writeHead(404);
            res.end(`Command ${command} for channel ${channel} not found`);
            return;
        }
        delete commands[command];
        db.query(`UPDATE channels SET commands=? WHERE name=?`, [JSON.stringify(commands), channel], (err, results) => {
            if (err) {
                res.writeHead(500);
                res.end(`ERROR: ${err}`);
                return;
            }
            actions.refreshChannelData(channel);
            res.writeHead(200);
            res.end();
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