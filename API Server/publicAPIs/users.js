// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');

const get = (db, req, res) => {
    db.query("SELECT COUNT(*) AS users FROM channels", (err, results) => {
        if (err) {
            res.writeHead(500);
            res.end(`ERROR: ${err}`);
            return;
        }
        const query = url.parse(req.url, true).query;
        res.writeHead(200);
        if (query.json !== undefined) {
            let responseObject = {
                'schemaVersion': 1,
                'label': 'users',
                'message': results[0].users.toString(),
                'color': 'blue'
            }
            res.end(JSON.stringify(responseObject));
        } else {
            res.end(results[0].users.toString());
        }
    });
}

module.exports = (db, req, res) => {
    if (req.method === 'GET') {
        get(db, req, res);
    } else {
        res.writeHead(400);
        res.end('Bad Request');
    }
}