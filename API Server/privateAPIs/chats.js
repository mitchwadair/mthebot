// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const get = (db, req, res) => {
    const channel = req.params.channel;
    db.query(`SELECT enabled FROM channels WHERE id=?`, [channel], (err, results) => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        } else if (!results.length) {
            res.status(404).send(`Channel ${channel} not found`);
            return;
        }
        res.status(200).send(results[0].enabled.toString());
    });
}

const post = (db, actions, req, res) => {
    const channel = req.params.channel;
    db.query(`UPDATE channels SET enabled=true WHERE id=?`, [channel], err => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }
        actions.joinChannel(channel).then(r => {
            res.status(200).send(`Bot set to enabled for channel ${channel}`);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    });
}

const remove = (db, actions, req, res) => {
    const channel = req.params.channel
    db.query(`UPDATE channels SET enabled=false WHERE id=?`, [channel], err => {
        if (err) {
            res.status(500).send(err.toString());
            return;
        }
        actions.leaveChannel(channel).then(_ => {
            res.status(200).send(`Bot set to disabled for channel ${channel}`);
        }).catch(err => {
            res.status(500).send(err.toString());
        });
    });
}

module.exports = {
    get,
    post,
    remove
}