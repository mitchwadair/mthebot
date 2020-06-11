// Copyright (c) 2020 Mitchell Adair
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

const url = require('url');

module.exports = {
    getChannelFromURL: _url => {
        return url.parse(_url).pathname.split('/')[2];
    }
}