/**
 * @description cli to launch chrome.
 */
const R     = require('ramda'),
    fs      = require('fs'),
    path    = require('path'),
    request = require('superagent'),
    child_process = require('child_process'),
    { TIMEOUT, ENCODING, CWD, HOST, PORT } = require('./config');

const NOOP = () => null;
const Url = (path) => 'http://' + HOST + ':' + PORT + UrlPath(path);
const UrlPath = (path) => path ? trimUrlPath('/' + path) : '';
const trimRepeat = R.curry((repeat, string) => {
    return R.replace(new RegExp('[' + repeat + ']{2,}', 'g'), repeat, string);
});
const trimUrlPath = trimRepeat('/');
const requester = R.curry((method, path, fn, data) => {
    let url = Url(path);
    request[method](url)
        .timeout(TIMEOUT)
        .send(data)
        .end(fn);
});
const checkStatus = R.curry((fn, err, data) => {
    fn(err || data.err, data && data.body);
});
const checkRequest = fn => requester('get', 'check', checkStatus(fn), {});
const killRequest = () => requester('get', 'kill', NOOP, {});
const launchRequest = data => requester('post', 'launch', checkStatus((err) => {
    if (err) {
        console.log('launch chrome failed:', err.message || err);
    }
}), data);
/**
 * @description send a request to launch server to launch chrome
 * @param {Object} options 
 */
const launchChrome = (options) => {
    let { yaml, deploy_type = 'dev', url, mode } = options,
        data = {
            deploy_type,
            url,
            mode
        };
    let _yaml = path.isAbsolute(yaml) ? yaml : path.resolve(CWD, yaml);
    if (!fs.existsSync(_yaml)) return console.log('ERROR', yaml, 'NOT FOUND');
    data.yaml = fs.readFileSync(_yaml, ENCODING);
    data.gid = 'urlhosts_' + encodeURIComponent(CWD) + '_' + deploy_type;
    launchRequest(data);
};

const client = (options) => {
    if (options.kill) return killRequest();
    function startSeverInBackground(err) {
        if (err) {
            child_process.exec(__dirname + '/index.js server>/dev/null 2>&1 &', (err) => {
                if (err) return console.log(err);
                let cnt = 0,
                    timer = setInterval(() => {
                        checkRequest((err) => {
                            cnt++;
                            if (!err || cnt > 40) clearInterval(timer);
                            if (!err) launchChrome(options);
                        });
                    }, 200);
            });
        } else {
            launchChrome(options);
        }
    }
    checkRequest(startSeverInBackground);
};

module.exports = {
    client,
    launchChrome
};