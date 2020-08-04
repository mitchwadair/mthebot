// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const http = require('http');
const https = require('https');
const url = require('url');
const users = require('./publicAPIs/users');
const commands = require('./privateAPIs/commands');
const timers = require('./privateAPIs/timers');
const events = require('./privateAPIs/events');
const chats = require('./privateAPIs/chats');
const init = require('./privateAPIs/init');
const contact = require('./publicAPIs/contact');
const auth = require('./privateAPIs/auth');

const getArgsFromURL = require('./utils').getArgsFromURL;

module.exports = function(db, actions) {
    // API routes
    const apiRoutes = {
        public: {
            'users': users,
            'contact': contact,
        },
        private: {
            'commands': commands,
            'timers': timers,
            'events': events,
            'chats': chats,
            'init': init,
            'auth': auth,
        }
    }

    let sessionPool = {};

    // request handler
    const apiRequestHandler = (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        // prevent CORS issue
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        const path = url.parse(req.url).pathname.split('/')[1];
        const isPrivateRequest = Object.keys(apiRoutes.private).includes(path);
        const handler = isPrivateRequest ? apiRoutes.private[path] : apiRoutes.public[path];

        if (isPrivateRequest) {
            //allow all requests in development
            if (process.env.NODE_ENV === 'development') {
                if (handler) {
                    handler(db, actions, req, res);
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
                return;
            }

            const channel = getArgsFromURL(req.url)[0];
            if (sessionPool[channel]) {
                clearTimeout(sessionPool[channel].timeout);
                sessionPool[channel] = {
                    timeout: setTimeout(_ => {
                        clearTimeout(sessionPool[channel].timeout);
                        delete sessionPool[channel];
                    }, 300000),
                }
                if (handler) {
                    handler(db, actions, req, res);
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            } else {
                const headers = {
                    'Authorization': req.headers.authorization,
                    'Client-ID': process.env.CLIENT_ID,
                }
                https.get('https://id.twitch.tv/oauth2/validate', {headers: headers}, r => {
                    let body = [];
                    r.on('error', err => {
                        res.writeHead(err.status);
                        res.end(`ERROR: ${err}`);
                    }).on('data', chunk => {
                        body.push(chunk);
                    }).on('end', _ => {
                        body = JSON.parse(Buffer.concat(body).toString());
                        if (body.expires_in < 3600) {
                            res.writeHead(401);
                            res.end('OAuth Token Expired');
                        } else if (body.user_id !== channel) {
                            res.writeHead(401);
                            res.end('Unauthorized request to private API');
                        } else {
                            sessionPool[channel] = {
                                timeout: setTimeout(_ => {
                                    clearTimeout(sessionPool[channel].timeout);
                                    delete sessionPool[channel];
                                }, 300000),
                            }
                            if (handler) {
                                handler(db, actions, req, res);
                            } else {
                                res.writeHead(404);
                                res.end('Not Found');
                            }
                        }
                    });
                });
            }
        } else {
            if (handler) {
                handler(db, req, res);
            } else {
                res.writeHead(404);
                res.end('Not Found');
            }
        }
    }

    // basic http server
    const server = http.createServer(apiRequestHandler);
    server.listen(process.env.PORT || 8080, '0.0.0.0', _ => {});
}