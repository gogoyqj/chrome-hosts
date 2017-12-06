/**
 * @description copy/update extension for chrome
 */
const fs = require('fs'),
    path = require('path'),
    R = require('ramda'),
    nodejsFsUtils = require('nodejs-fs-utils'),
    { TMPDIR, HOST, SOCKET, ENCODING, NEW, CREATED, KILL } = require('../config'),
    TplExtDir = path.join(__dirname, 'host-switch-plus');

const UNICODE = (str) => R.replace(/[\u4e00-\u9fa5]/g, (mat) => escape(mat).replace(/%u/g, '\\u'), decodeURIComponent(str));

module.exports = {
    /**
     * @param {object} data
     * @return {object} chrome args
     */
    copyExt: data => {
        let { json = {}, gid } = data,
            { $hosts, $rewriteUrls, $urls, isMobile } = json,
            args = {};
        if ($hosts || $rewriteUrls) {
            let ExtDir = path.join(TMPDIR, gid);
            nodejsFsUtils.copySync(TplExtDir, ExtDir, (err) => {
                err && console.log('ERROR: copy host-switch-plus failed with', err);
            });
            let html = '';
            if ($urls instanceof Array) {
                $urls.forEach(({ url, name}) => {
                    html += '<p><a target="_blank" href="' + UNICODE(url) + '">' + UNICODE(name) + '</a></p>';
                });
                if (html) {
                    html = (isMobile ? '<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,minimal-ui">' : '') +
                    `<style>html{font-size:14px;}</style><h2>快速入口</h2>` + html;
                }
            }
            let DefaultModelJs = fs.readFileSync(path.join(TplExtDir, 'js', 'background.js'), ENCODING);
            let copyDomain = $rewriteUrls['@@__@@'];
            delete $rewriteUrls['@@__@@'];
            let str = JSON.stringify($rewriteUrls || {});
            let jsContent = `
${
    DefaultModelJs
        .replace('/*__hosts__placeholder__*/', 'results = ' + JSON.stringify($hosts || []) + ';')
        .replace('/*__ruleDomains__placeholder__*/', 'ruleDomains = ' + str + ';')
}
;window.$CookieMapping = {};
window.$LoadCookie = function(domain) {
    return new Promise(function(rs, rj) {
        var timer = setTimeout(function() {
            var message = 'get cookie from ' + domain + ' time out';
            console.warn(message);
            rj(message);
        }, 5000);
        chrome.cookies.getAll({ domain: domain.replace(/^@/g, '')}, function(cookies) {
            $CookieMapping[domain] = cookies.map(function(c) {
                return c.name + '=' + c.value;
            }).join(';');
            rs($CookieMapping[domain]);
            clearTimeout(timer);
        });
    });
};
${JSON.stringify(copyDomain)}.map($LoadCookie);
connection = new WebSocket("ws://${HOST}:${SOCKET}");
connection.onopen = function () {
    console.log("Connection opened");
    connection.send(JSON.stringify({gid: '${gid}', action: '${NEW}'}));
}
connection.onclose = function () {
    console.log("Connection closed");
}
connection.onerror = function () {
    console.error("Connection error");
}
connection.onmessage = function (event) {
    var data = event.data;
    try {
        data = JSON.parse(data);
        var url = data.url, TYPE = data.TYPE, Cookie = data.Cookie;
        if (Cookie) {
            Cookie = Cookie.split(';')
            Cookie.forEach(function(c) {
                if (c[0] === '@') {
                    chrome.cookies.getAll({ domain: c.substr(1)}, function(cookies) {
                        cookies.map(function(c) {
                            chrome.cookies.set({
                                url: url,
                                name: c.name,
                                expirationDate: c.expirationDate,
                                value: c.value
                            }) 
                        });
                    });
                } else {
                    var pos = c.indexOf('=');
                    if (pos > -1) {
                        chrome.cookies.set({
                            url: url,
                            name: c.substr(0, pos).trim(),
                            value: c.substr(pos+1).trim()
                        })
                    }
                }
            })
        }
        switch (TYPE) {
            case '${NEW}':
                reloadTab(null, url);
                break;
            case '${CREATED}':
                localStorage.setItem('$url', url);
                location.reload();
                break;
        }
    } catch(e) {

    }
}
function reloadTab(checker, url) {
    checker = checker || function(tab, i) { 
        return i === 0 && url;
    };
    chrome.tabs.query({active: true}, function(tabs) {
        var matched;
        tabs.forEach(function(tab, i) {
            let _url = checker(tab, i);
            if (_url) {
                matched = true;
                chrome.tabs.update(tab.tabId, { url: _url });
            }
        });
        if (!matched) {
            chrome.tabs.create({ url: url });
        }
    });
}
function updateTab(url) {
    let checker = function(tab, i) {
        return tab.url.indexOf(url) === 0 && tab.url;
    }
    return reloadTab(checker, url);
}
let $url = localStorage.getItem('$url');
if ($url) {
    localStorage.removeItem('$url');
    updateTab($url);
}
chrome.tabs.onRemoved.addListener(function() {
    chrome.tabs.query({}, function(tabs) {
        if (tabs.length < 1) {
            connection.send(JSON.stringify({gid: '${gid}', action: '${KILL}'}))
        }
    })
});
window.onbeforeunload = () => {
    connection.close();
};
            `;
            fs.writeFileSync(path.join(ExtDir, 'js', 'background.js'), jsContent, ENCODING);
            args['--load-extension'] = ExtDir;
            args['--user-data-dir'] = `${ExtDir}_data`;
        }
        return args;
    }
};