// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const http = require('http');
const url = require('url');
const users = require('./publicAPIs/users');
const commands = require('./privateAPIs/commands');
const timers = require('./privateAPIs/timers');
const events = require('./privateAPIs/events');

module.exports = function(db, actions) {
    // API routes
    const apiRoutes = {
        public: {
            'users': users,
        },
        private: {
            'commands': commands,
            'timers': timers,
            'events': events
        }
    }

    // request handler
    const apiRequestHandler = (req, res) => {
        const origin = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || req.connection.socket.remoteAddress;
        const path = url.parse(req.url).pathname.split('/')[1];

        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
        const isPrivateRequest = Object.keys(apiRoutes.private).includes(path);
        console.log(`**** TEST HOST:${req.headers.host}, ISPRIVATE:${isPrivateRequest}`);

        if (isPrivateRequest && !allowedOrigins.includes(origin)) {
            res.writeHead(401);
            res.end('Unauthorized request to private API');
            return;
        }
        
        const handler = isPrivateRequest ? apiRoutes.private[path] : apiRoutes.public[path];
        if (handler) {
            res.setHeader('Access-Control-Allow-Origin', '*')
            isPrivateRequest ? handler(db, actions, req, res) : handler(db, req, res);
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    // basic http server
    const server = http.createServer(apiRequestHandler);
    server.listen(process.env.PORT || 8080, '0.0.0.0', _ => {});
}