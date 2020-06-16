// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');

module.exports = {
    getArgsFromURL: _url => {
        let args = url.parse(_url).pathname.split('/');
        args.splice(0, 2);
        return args;
    }
}