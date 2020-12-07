// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const get = (db, req, res) => {
    db.query("SELECT COUNT(*) AS users FROM channels", (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }
        res.status(200);
        if (req.query.json !== undefined) {
            let responseObject = {
                'schemaVersion': 1,
                'label': 'users',
                'message': results[0].users.toString(),
                'color': 'blue'
            }
            res.json(responseObject);
        } else {
            res.send(results[0].users.toString());
        }
    });
}

module.exports = {
    get
}