const url = require('url');
const getChannelFromURL = require('../utils').getChannelFromURL;

const get = (db, req, res) => {
    const channel = getChannelFromURL(req.url);
    db.query(`SELECT timers FROM channels WHERE name=?`, [channel], (err, results) => {
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
        res.end(results[0].timers);
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
        db.query(`UPDATE channels SET timers=? WHERE name=?`, [body,channel], err => {
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

const remove = (db, actions, req, res) => {
    const channel = getChannelFromURL(req.url);
    const timer = url.parse(req.url).pathname.split('/')[3];
    db.query(`SELECT timers FROM channels WHERE name=?`, [channel], (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        } else if (!results.length) {
            res.writeHead(404);
            res.end(`Channel ${channel} not found`);
            return;
        }
        let timers = JSON.parse(results[0].timers);
        if (!Object.keys(timers).includes(timer)) {
            res.writeHead(404);
            res.end(`Timer ${timer} for channel ${channel} not found`);
            return;
        }
        delete timers[timer];
        db.query(`UPDATE channels SET timers=? WHERE name=?`, [JSON.stringify(timers), channel], (err, results) => {
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