/**
 * @description format yaml to usable hosts/url rewrite rules
 */
const jsYaml = require('js-yaml');

const formatRewriteUrls = json => {
    let { rewriteUrls, deploy_type = 'dev' } = json,
        ruleMap;
    rewriteUrls = rewriteUrls && rewriteUrls[deploy_type] || rewriteUrls;
    if (rewriteUrls instanceof Array) {
        ruleMap = {};
        rewriteUrls.forEach(function(item, index) {
            if (item.on !== false) item.on = true;
            if (!item.matchUrl) item.matchUrl = '*';
            if (item.rules) {
                item.rules = item.rules.map(function(rule) {
                    if (typeof rule === 'string') {
                        let _rule = {};
                        rule.replace(/(^[^ ]+)[ ]+([^ ]+)(.*$)/g, function(mat, fr, to, title) {
                            _rule.match = fr.trim();
                            _rule.replace = to.trim();
                            _rule.title = title;
                        });
                        rule = _rule;
                    }
                    if (rule.on !== false) rule.on = true;
                    if (('requestRules' in rule) || ('responseRules' in rule)) {
                        rule.type = 'headerRule';
                        ['requestRules', 'responseRules'].forEach(function(key) {
                            let val = rule[key];
                            let str = [];
                            if (val) {
                                for (let r in val) {
                                    str.push('set ' + r + ': ' + val[r]);
                                }
                            }
                            rule[key] = str.join(';');
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
        })
    }
    return ruleMap;
}

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
            url.replace(/(^|[ ])http[s]?:\/\/[^\[\]\(\) \r\n]+[ ]?/g, function(u) {
                _url.url = u.trim();
                return placeHolder;
            }).split(placeHolder).forEach(function(parts, index) {
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
}

const format = (url, json) => {
    let { deploy_type } = json,
        reg = /\$\{([^\}]+)\}/g;
    url = url.replace(reg, function(mat, val) {
        let configValue = json[val] || '';
        configValue = deploy_type in configValue ? configValue[deploy_type] : configValue;
        return configValue;
    });
    if (url.match(reg)) return format(url, json);
    return url;
}

const formatHosts = (json) => {
    let { hosts, deploy_type = 'dev' } = json,
        _hosts = [], 
        cnt = 0;
    hosts = hosts[deploy_type] || hosts;
    if (hosts instanceof Array) {
        hosts.forEach(function(host, index) {
            host = host.trim();
            if (host.indexOf('#') === 0) return;
            host = host.split(' ');
            if (host.length < 2) return;
            let domain = host[1].split(',');
            domain.forEach(function(item) {
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
}

module.exports = {
    format: (data) => {
        let { deploy_type = 'dev', yaml, gid } = data,
            json = {}
        try {
            json = jsYaml.safeLoad(yaml);
        } catch(e) {
            json.err = e;
        }
        if (json.err) return json;
        json.deploy_type = deploy_type;
        json.gid = json.gid || gid;
        json.$rewriteUrls = formatRewriteUrls(json);
        json.$urls = formatUrls(json);
        json.$hosts = formatHosts(json);
        return json;
    }
}