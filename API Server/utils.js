const url = require('url');

module.exports = {
    getChannelFromURL: _url => {
        return url.parse(_url).pathname.split('/')[2];
    }
}