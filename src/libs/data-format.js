/**
 * @description format yaml to usable hosts/url rewrite rules
 */
const jsYaml = require('js-yaml'),
    R = require('ramda');

const formatRewriteUrls = json => {
    let { rewriteUrls, deploy_type = 'dev' } = json,
        ruleMap;
    rewriteUrls = rewriteUrls && rewriteUrls[deploy_type] || rewriteUrls;
    if (rewriteUrls instanceof Array) {
        ruleMap = {
            '@@__@@': []
        };
        rewriteUrls.forEach((item, index) => {
            if (item.on !== false) item.on = true;
            if (!item.matchUrl) item.matchUrl = '*';
            if (item.rules) {
                item.rules = item.rules.map((rule) => {
                    if (typeof rule === 'string') {
                        let _rule = {};
                        rule.replace(/(^[^ ]+)[ ]+([^ ]+)(.*$)/g, (mat, fr, to, title) => {
                            _rule.match = fr.trim();
                            _rule.replace = to.trim();
                            _rule.title = title;
                        });
                        rule = _rule;
                    }
                    if (rule.on !== false) rule.on = true;
                    if (('requestRules' in rule) || ('responseRules' in rule)) {
                        rule.type = 'headerRule';
                        ['requestRules', 'responseRules'].forEach((key) => {
                            let val = rule[key];
                            let str = [];
                            if (val) {
                                for (let r in val) {
                                    str.push('set ' + r + ': ' + val[r]);
                                    if (r === 'Cookie' && val[r][0] === '@') {
                                        if (val[r] === '@') {
                                            throw Error('Cookie: "@" is not Supported');
                                        }
                                        if (ruleMap['@@__@@'].indexOf(val[r]) === -1) {
                                            ruleMap['@@__@@'].push(val[r]);
                                        }
                                    }
                                }
                            }
                            rule[key] = str.join('@@__@@');
                        });
                    } else {
                        rule.type = 'normalOverride';
                    }
                    return rule;
                });
            } else {
                item.on = false;
            }
            ruleMap[item.id = 'd' + index] = item;
        });
    }
    return ruleMap;
};

const formatUrls = json => {
    let { urls, deploy_type = 'dev' } = json,
        placeHolder = '@@__@@',
        indexToName = ['name'],
        _urls = [],
        isArr = urls instanceof Array;
    urls = urls[deploy_type] || urls;
    for (let key in urls) {
        let url  = urls[key];
        if (typeof url === 'string') {
            let _url = {};
            url = format(decodeURIComponent(url), json);
            url.replace(/(^|[ ])http[s]?:\/\/[^\[\]\(\) \r\n]+[ ]?/g, (u) => {
                _url.url = u.trim();
                return placeHolder;
            }).split(placeHolder).forEach((parts, index) => {
                if (indexToName[index]) {
                    _url[indexToName[index]] = parts.trim();
                }
            });
            if (!isArr) _url[indexToName[0]] = key;
            url = _url;
        } else {
            url.url = format(url.url, json);
        }
        _urls.push(url);
    }
    return _urls;
};

const format = (url, json) => {
    let { deploy_type } = json,
        reg = /\$\{([^\}]+)\}/g;
    url = url.replace(reg, (mat, val) => {
        let configValue = json[val] || '';
        configValue = deploy_type in configValue ? configValue[deploy_type] : configValue;
        return configValue;
    });
    if (url.match(reg)) return format(url, json);
    return url;
};

const formatHosts = (json) => {
    let { hosts, deploy_type = 'dev' } = json,
        _hosts = [],
        cnt = 0;
    hosts = hosts[deploy_type] || hosts;
    if (hosts instanceof Array) {
        hosts.forEach((host, index) => {
            host = host.trim();
            if (host.indexOf('#') === 0) return;
            host = host.split(' ');
            if (host.length < 2) return;
            let domain = host[1].split(',');
            domain.forEach((item) => {
                _hosts.push({
                    ip: host[0],
                    domain: item.trim(),
                    status: 1,
                    order: index,
                    id: cnt,
                    uptime: "2017-06-19 16:59:54",
                    tags: host.slice(2).join(' '),
                    note: ""
                });
                cnt++;
            });
        });
    }
    return _hosts;
};

module.exports = {
    format: (data) => {
        let { yaml, url, deploy_type } = data,
            json = {},
            err;
        try {
            json = jsYaml.safeLoad(yaml);
            json.isMobile = 'isMobile' in data ? !!data.isMobile : !!json.isMobile;
            deploy_type = data.deploy_type = json.deploy_type = 'deploy_type' in data ? data.deploy_type : json.deploy_type;
            json.$rewriteUrls = formatRewriteUrls(json);
            json.$urls = formatUrls(json);
            json.$hosts = formatHosts(json);
            if (String(url).indexOf('http') !== 0) json.$urls.map((item) => {
                if (item.name === url) url = item.url;
            });
            let tmp = Number(url);
            if (tmp > -1 || !url) {
                url = (json.$urls[tmp] || json.$urls[0] || {}).url;
            }
        } catch (e) {
            err = e;
        }
        return R.mergeAll([{
            err,
            json
        }, data, { url }]);
    }
};