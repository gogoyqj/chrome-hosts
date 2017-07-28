/**
 * @description launch chrome with --args
 */
const R = require('ramda');
const path = require('path');
const fsAccess = require('fs-access');
const which = require('which');
const { copyExt } = require('./ext-factory');
const { format } = require('./data-format');
const child_process = require('child_process');
const { CREATED, NEW } = require('../config');
const otherArgs = {
    '--no-default-browser-check': '',
    '--disable-translate': '',
    '--no-first-run': ''//,
    // "--ignore-certificate-errors": ''
};
const mobileArgs = {
    '--user-agent': '"Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1"',
    '--auto-open-devtools-for-tabs': ''
};

const argsToString = (arr) => {
    let t = [], o = R.mergeAll(arr);
    for (let key in o) {
        let v = o[key];
        if (v !== '') {
            t.push(key + '=' + v);
        } else {
            t.push(key);
        }
    }
    return t;//.join(' ')
};

// is copy from https://github.com/karma-runner/karma-chrome-launcher/blob/master/index.js
const getChromeExe = (chromeDirName) => {
    // Only run these checks on win32
    if (process.platform !== 'win32') {
        return null;
    }
    let windowsChromeDirectory, i, prefix;
    let suffix = '\\Google\\' + chromeDirName + '\\Application\\chrome.exe';
    let prefixes = [process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']];

    for (i = 0; i < prefixes.length; i++) {
        prefix = prefixes[i];
        try {
            windowsChromeDirectory = path.join(prefix, suffix);
            fsAccess.sync(windowsChromeDirectory);
            return windowsChromeDirectory;
        } catch (e) { }
    }

    return windowsChromeDirectory;
};

const getChromeDarwin = defaultPath => {
    if (process.platform !== 'darwin') {
        return null;
    }

    try {
        let homePath = path.join(process.env.HOME, defaultPath);
        fsAccess.sync(homePath);
        return homePath;
    } catch (e) {
        return defaultPath;
    }
};

const getBin = commands => {
    // Don't run these checks on win32
    if (process.platform !== 'linux') {
        return null;
    }
    let bin, i;
    for (i = 0; i < commands.length; i++) {
        try {
            if (which.sync(commands[i])) {
                bin = commands[i];
                break;
            }
        } catch (e) { }
    }
    return bin;
};


const BINS = {
    linux: getBin(['google-chrome', 'google-chrome-stable']),
    darwin: getChromeDarwin('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    win32: getChromeExe('Chrome')
};
const Pool = {};
module.exports = {
    /**
     * @description kill a launched chrome process
     */
    kill: gid => {
        let ck = _gid => { return !gid || gid === _gid; };
        for (let _gid in Pool) {
            if (ck(_gid)) {
                let pro = Pool[_gid];
                pro && pro.kill && pro.kill();
            }
        }
    },
    /**
     * @description launch a chrome process
     */
    launch: data => {
        let { gid } = data;
        data = format(data);
        let { err, json } = data;
        if (err) return Promise.reject(err);
        let { isMobile } = json,
            args = argsToString([{}, copyExt(data), isMobile ? mobileArgs : {}, otherArgs]),
            bin = BINS[process.platform];
        return new Promise((rs, rj) => {
            let _rs = d => rs(R.merge(d, data));
            if (gid in Pool) {
                console.log('exist, do reload');
                return _rs({ TYPE: CREATED });
            }
            if (bin) {
                try {
                    let chrome = child_process.spawn(bin, args);
                    Pool[gid] = chrome;
                    _rs({ TYPE: NEW });
                    chrome.on('close', () => {
                        // let ExtDir = path.join(TMPDIR, gid);
                        // if (fs.existsSync(ExtDir)) {
                        //     nodejsFsUtils.rmdirsSync(ExtDir);
                        // }
                        if (gid in Pool) delete Pool[gid];
                    });
                } catch (e) {
                    rj(e);
                }
            } else {
                rj('runnable chrome not found.');
            }
        });
    }
};