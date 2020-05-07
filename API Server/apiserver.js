// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const http = require('http');
const url = require('url');

module.exports = function(db) {
    // users API
    const users = (req, res) => {
        if (req.method === 'GET') {
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
        } else {
            res.writeHead(400);
            res.end('Bad Request');
        }
    }

    // API routes
    const apiRoutes = {
        '/users': users,
    }

    // request handler
    const apiRequestHandler = (req, res) => {
        const path = url.parse(req.url).pathname;
        const handler = apiRoutes[path];
        if (handler) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            handler(req, res);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    // basic http server
    const server = http.createServer(apiRequestHandler);
    server.listen(process.env.PORT || 8080);
}