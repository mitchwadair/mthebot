// Copyright (c) 2020 Mitchell Adair
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const DBService = require("../../dbservice");

const get = async (req, res) => {
    try {
        const count = await DBService.getUserCount();
        res.status(200);
        if (req.query.json) {
            let responseObject = {
                schemaVersion: 1,
                label: "users",
                message: count.toString(),
                color: "blue",
            };
            res.json(responseObject);
        } else {
            res.send(count.toString());
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

module.exports = {
    get,
};
