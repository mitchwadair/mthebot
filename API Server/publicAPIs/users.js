// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require('../../dbservice');

const get = (req, res) => {
    DBService.getUserCount().then(count => {
        res.status(200);
        if (req.query.json !== undefined) {
            let responseObject = {
                'schemaVersion': 1,
                'label': 'users',
                'message': count.toString(),
                'color': 'blue'
            }
            res.json(responseObject);
        } else {
            res.send(count.toString());
        }
    }).catch(err => {
        res.status(500).send(err.toString());
    });
}

module.exports = {
    get
}