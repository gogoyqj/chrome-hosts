/**
 * @description copy/update extension for chrome
 */
const fs = require('fs'),
    path = require('path'),
    R = require('ramda'),
    nodejsFsUtils = require('nodejs-fs-utils'),
    { DIR, TMPDIR, CWD, HOST, PORT, SOCKET, ENCODING } = require('../config'),
    TplExtDir = path.join(__dirname, 'host-switch-plus'),
    DefaultModelJs = fs.readFileSync(path.join(TplExtDir, 'js', 'background.js'), ENCODING);

const UNICODE = (str) => R.replace(/[\u4e00-\u9fa5]/g, (mat) => escape(mat).replace(/%u/g, '\\u'), decodeURIComponent(str));

module.exports = {
    /**
     * @param {object} json
     * @return {object} chrome args
     */
    copy: json => {
        let { $hosts, $rewriteUrls, $urls, deploy_type, gid } = json,
            args = {};
        if ($hosts || $rewriteUrls) {
            let ExtDir = path.join(TMPDIR, gid);
            nodejsFsUtils.copySync(TplExtDir, ExtDir, function(err) {
                err && console.log('ERROR: copy host-switch-plus failed with', err);
            });
            let html = '';
            if ($urls instanceof Array) {
                $urls.forEach(({ url, name}) => {
                    html += '<p><a target="_blank" href="' + UNICODE(url) + '">' + UNICODE(name) + '</a></p>';
                })
            }
            let jsContent = `
var urlList = window.open('about:blank');
if(${!!html}) urlList.document.write('${html}');
connection = new WebSocket("ws://${HOST}:${SOCKET}");
connection.onopen = function () {
    console.log("Connection opened");
    connection.send('${gid}');
}
connection.onclose = function () {
    console.log("Connection closed");
}
connection.onerror = function () {
    console.error("Connection error");
}
connection.onmessage = function (event) {
    location.reload();
}
window.onbeforeunload = () => {
    connection.close();
};
            ` + 
                DefaultModelJs.replace('/*__hosts__placeholder__*/', 'results = ' + JSON.stringify($hosts || []) + ';').replace('/*__ruleDomains__placeholder__*/', 'ruleDomains = ' + JSON.stringify($rewriteUrls || {}) + ';');
            fs.writeFileSync(path.join(ExtDir, 'js', 'background.js'), jsContent, ENCODING);
            args['--load-extension'] = ExtDir;
            args['--user-data-dir'] = ExtDir;
        }
        return args;
    }
}