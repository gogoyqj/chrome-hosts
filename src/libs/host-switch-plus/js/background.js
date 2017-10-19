// for host
var enableHosts = [];
var default_mode = 'pac_script';

chrome.webRequest.onCompleted.addListener(function (details) {
    data[details.tabId] = details.ip;
    setTimeout(function(){
        details.req = 'showip';
        details.hosts = enableHosts;
        chrome.tabs.sendRequest(details.tabId, details, function (response) {
            console.log('res:', response);
        });
    },1000);
}, {
    urls: [ 'http://*/*', 'https://*/*' ],
    types: [ 'main_frame' ]
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
    enableHosts = request;
});
var script = '';
var results = [];
/*__hosts__placeholder__*/
for (var i = 0; i < results.length; i++) {
    var info = results[i];
    var ip = info.ip;
    var port = 80;

    if (info.domain.indexOf('*') != -1) {
        script += '}else if(shExpMatch(host,"' + info.domain + '")){';
    } else if (info.domain.indexOf(':') != -1) {
        var t = info.domain.split(':');
        port = t[1];
        script += '}else if(shExpMatch(url,"http://' + info.domain + '/*") || shExpMatch(url,"https://' + info.domain + '/*")){';
    } else {
        script += '}else if(host == "' + info.domain + '"){';
    }

    if (info.ip.indexOf(':') > -1) {
        var ip_port = info.ip.split(':');
        ip = ip_port[ip_port.length - 2];
        port = ip_port[ip_port.length - 1];
    }
    script += 'return "PROXY ' + ip + ':' + port + '; DIRECT";';

    script += "\n";
}

var data = 'function FindProxyForURL(url,host){ \n if(shExpMatch(url,"http:*") || shExpMatch(url,"https:*")){if(isPlainHostName(host)){return "DIRECT";' +
    script + '}else{return "' + default_mode + '";}}else{return "SYSTEM";}}';
chrome.proxy.settings.set({
    value: {
        //mode: 'system'
        // mode: 'direct'
        mode: default_mode,
        pacScript: {
            data:data
        }
    },
    scope: 'regular'
}, function () {

});

// copy from https://chrome.google.com/webstore/detail/resource-override/pkoacgokdfckfpndoffpifphamojphiiß
// for url rewrite
var ruleDomains = {};
/*__ruleDomains__placeholder__*/;
(function() {
    "use strict";

    /* globals chrome, unescape, keyvalDB, match, matchReplace */

    var syncFunctions = [];

    var logOnTab = function(tabId, message, important) {
        if (localStorage.showLogs === "true") {
            important = !!important;
            chrome.tabs.sendMessage(tabId, {
                action: "log",
                message: message,
                important: important
            });
        }
    };

    // http://stackoverflow.com/questions/15124995/how-to-wait-for-an-asynchronous-methods-callback-return-value
    var tabUrlTracker = (function() {
        // All opened urls
        var urls = {};
        var closeListeners = [];

        var queryTabsCallback = function(allTabs) {
            if (allTabs) {
                allTabs.forEach(function(tab) {
                    urls[tab.id] = tab.url;
                });
            }
        };

        var updateTabCallback = function(tabId, changeinfo, tab) {
            urls[tabId] = tab.url;
        };

        // Not all tabs will fire an update event. If the page is pre-rendered,
        // a replace will happen instead.
        var tabReplacedCallback = function(newTabId, oldTabId) {
            delete urls[oldTabId];
            chrome.tabs.get(newTabId, function(tab) {
                urls[tab.id] = tab.url;
            });
        };

        var removeTabCallback = function(tabId) {
            closeListeners.forEach(function(fn) {
                fn(urls[tabId]);
            });
            delete urls[tabId];
        };

        // init
        chrome.tabs.query({}, queryTabsCallback);
        chrome.tabs.onUpdated.addListener(updateTabCallback);
        chrome.tabs.onRemoved.addListener(removeTabCallback);
        chrome.tabs.onReplaced.addListener(tabReplacedCallback);

        return {
            getUrlFromId: function(id) {
                return urls[id];
            }
        };
    })();

    var extractMimeType = function(requestUrl, file) {
        file = file || "";
        var possibleExt = (requestUrl.match(/\.[A-Za-z]{2,4}$/) || [""])[0];
        var looksLikeCSSRegex = /[#.@][^\s\{]+\s*\{/;
        var looksLikeJSRegex = /(var|const|let|function)\s+.+/;
        var looksLikeXMLRegex = /<\?xml(\s+.+\s*)?\?>/i;
        var looksLikeHTMLRegex = /<html(\s+.+\s*)?>/i;
        var mimeInFileRegex = /\/\* *mime: *([-\w\/]+) *\*\//i;
        var firstLine = (file.match(/.*/) || [""])[0];
        var userMime = firstLine.match(mimeInFileRegex);
        userMime = userMime ? userMime[1] : null;
        var extToMime = {
            ".js": "text/javascript",
            ".html": "text/html",
            ".css": "text/css",
            ".xml": "text/xml"
        };
        var mime = extToMime[possibleExt];
        if (!mime) {
            if (looksLikeHTMLRegex.test(file)) {
                mime = "text/html";
            } else if (looksLikeXMLRegex.test(file)) {
                mime = "text/xml";
            } else if (looksLikeJSRegex.test(file)) {
                mime = "text/javascript";
            } else if (looksLikeCSSRegex.test(file)) {
                mime = "text/css";
            } else {
                mime = "text/plain";
            }
        }
        if (userMime) {
            mime = userMime;
            file = file.replace(mimeInFileRegex, "");
        }
        return {mime: mime, file: file};
    };

    var handleRequest = function(requestUrl, tabUrl, tabId) {
        if (requestUrl.match(/dumphosts/g)) {
            return {
                redirectUrl: "data:hosts;charset=UTF-8;base64," + btoa(unescape(encodeURIComponent(results.map(function(item){return item.ip + ' ' + item.domain}).join('\n'))))
            }
        }
        // hack to reload ext
        if (requestUrl.indexOf('--auto-regression-testing.com') !== -1) {
            return location.reload();
        }
        for (var key in ruleDomains) {
            var domainObj = ruleDomains[key];
            if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched) {
                var rules = domainObj.rules || [];
                for (var x = 0, len = rules.length; x < len; ++x) {
                    var ruleObj = rules[x];
                    if (ruleObj.on) {
                        if (ruleObj.type === "normalOverride") {
                            var matchedObj = match(ruleObj.match, requestUrl);
                            var newUrl = matchReplace(matchedObj, ruleObj.replace, requestUrl);
                            if (matchedObj.matched) {
                                logOnTab(tabId, "URL Override Matched: " + requestUrl +
                                    "   to:   " + newUrl + "   match url: " + ruleObj.match, true);
                                if (requestUrl !== newUrl) {
                                    return {redirectUrl: newUrl};
                                } else {
                                    // allow redirections to the original url (aka do nothing).
                                    // This allows for "redirect all of these except this."
                                    return;
                                }
                            }
                        } else if (ruleObj.type === "fileOverride" &&
                            match(ruleObj.match, requestUrl).matched) {

                            logOnTab(tabId, "File Override Matched: " + requestUrl + "   match url: " +
                                ruleObj.match, true);

                            var mimeAndFile = extractMimeType(requestUrl, ruleObj.file);
                            // unescape is a easy solution to the utf-8 problem:
                            // https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa#Unicode_Strings
                            return {redirectUrl: "data:" + mimeAndFile.mime + ";charset=UTF-8;base64," +
                                btoa(unescape(encodeURIComponent(mimeAndFile.file)))};
                        }
                    }
                }
                logOnTab(tabId, "No override match for: " + requestUrl);
            } else {
                logOnTab(tabId, "Rule is off or tab URL does not match: " + domainObj.matchUrl);
            }
        }
    };

    var makeHeaderHandler = function(type) {
        return function(details) {
            var headers = details[type + "Headers"];
            if (details.tabId > -1 && headers) {
                var tabUrl = tabUrlTracker.getUrlFromId(details.tabId);
                if (details.type === "main_frame") {
                    // a new tab must have just been created.
                    tabUrl = details.url;
                }
                if (tabUrl) {
                    return handleHeaders(type, details.url, tabUrl, headers, details.tabId);
                }
            }
        };
    };

    var parseHeaderDataStr = function(headerDataStr, requestUrl) {
        var ans = [];
        var rules = headerDataStr.split("@@__@@");
        var len = rules.length;
        for (var x = 0; x < len; x++) {
            var rule = rules[x];
            var ruleParts = rule.split(": ");
            if (ruleParts[0].indexOf("set") === 0) {
                if (ruleParts.length === 2) {
                    var val = decodeURIComponent(ruleParts[1]);
                    var name = decodeURIComponent(ruleParts[0].substring(4));
                    if (val[0] === '@') {
                        const hostname = requestUrl.split(/\/\//g)[1].split(/[\/\?#]+/g)[0];
                        if (name === 'Cookie') {
                            val = $CookieMapping[val] || $CookieMapping['@' + hostname] || val;
                        } else if (name === 'Host') {
                            val = hostname;// get hostname
                        } else {
                            val = requestUrl;
                        }
                    }
                    ans.push({
                        operation: "set",
                        name: name,
                        value: val,
                    });
                }
            } else if (ruleParts[0].indexOf("remove") === 0) {
                ans.push({
                    operation: "remove",
                    name: decodeURIComponent(ruleParts[0].substring(7))
                });
            }
        }
        return ans;
    };

    var makeHeadersObject = function(headers) {
        var ans = {};
        var len = headers.length;
        for (var x = 0; x < len; x++) {
            var header = headers[x];
            ans[header.name] = header;
        }
        return ans;
    };

    var handleHeaders = function(type, requestUrl, tabUrl, headers, tabId) {
        var headerObjToReturn = {};
        var headerObjToReturnKey = type + "Headers";
        headerObjToReturn[headerObjToReturnKey] = headers;
        for (var key in ruleDomains) {
            var domainObj = ruleDomains[key];
            var excludeUrl = domainObj.excludeUrl && match(domainObj.excludeUrl, tabUrl).matched; // 排除
            if (domainObj.on && match(domainObj.matchUrl, tabUrl).matched && !excludeUrl) {
                var rules = domainObj.rules || [];
                for (var x = 0, len = rules.length; x < len; ++x) {
                    var ruleObj = rules[x];
                    if (ruleObj.on && ruleObj.type === "headerRule") {
                        if (match(ruleObj.match, requestUrl).matched) {
                            var rulesStr = ruleObj[type + "Rules"];
                            logOnTab(tabId, "Header Rule Matched: " + requestUrl +
                                " applying rules: " + rulesStr, true);
                            var headerRules = parseHeaderDataStr(rulesStr, requestUrl);
                            var headersObj = makeHeadersObject(headers, requestUrl);
                            var numRules = headerRules.length;
                            for (var t = 0; t < numRules; t++) {
                                var rule = headerRules[t];
                                if (rule.operation === "set") {
                                    headersObj[rule.name] = {
                                        name: rule.name,
                                        value: rule.value
                                    };
                                } else {
                                    if (headersObj[rule.name]) {
                                        headersObj[rule.name] = undefined;
                                    }
                                }
                            }
                            var newHeaders = [];
                            for (var headerKey in headersObj) {
                                var header = headersObj[headerKey];
                                if (header) {
                                    newHeaders.push(header);
                                }
                            }
                            headerObjToReturn[headerObjToReturnKey] = newHeaders;
                            return headerObjToReturn;
                        }
                    }
                }
            }
        }
        return headerObjToReturn;
    };

    chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "makeGetRequest") {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", request.url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    sendResponse(xhr.responseText);
                }
            };
            xhr.send();
        } else if (request.action === "setSetting") {
            localStorage[request.setting] = request.value;
        } else if (request.action === "getSetting") {
            sendResponse(localStorage[request.setting]);
        } else if (request.action === "syncMe") {
            syncFunctions.push(sendResponse);
        } else if (request.action === "match") {
            sendResponse(match(request.domainUrl, request.windowUrl).matched);
        } else if (request.action === "extractMimeType") {
            sendResponse(extractMimeType(request.fileName, request.file));
        }

        // !!!Important!!! Need to return true for sendResponse to work.
        return true;
    });

    var requestIdTracker = (function() {
        var head;
        var tail;
        var length = 0;
        var tracker = {};
        var maxSize = 1000;

        function pop() {
            var val = head.val;
            head = head.next;
            length--;
            delete tracker[val];
        }

        function push(obj) {
            var newNode = {
                val: obj,
                next: undefined
            };
            if (length > 0) {
                tail.next = newNode;
                tail = newNode;
            } else {
                head = newNode;
                tail = newNode;
            }
            length++;
            tracker[obj] = true;
            while (length > maxSize) {
                pop();
            }
        }

        function has(id) {
            return tracker[id];
        }

        return {
            push: push,
            has: has
        };
    })();

    chrome.webRequest.onBeforeRequest.addListener(function(details) {
        if (!requestIdTracker.has(details.requestId)) {
            if (details.tabId > -1) {
                var tabUrl = tabUrlTracker.getUrlFromId(details.tabId);
                if (details.type === "main_frame") {
                    // a new tab must have just been created.
                    tabUrl = details.url;
                }
                if (tabUrl) {
                    var result = handleRequest(details.url, tabUrl, details.tabId);
                    if (result) {
                        // make sure we don't try to redirect again.
                        requestIdTracker.push(details.requestId);
                    }
                    return result;
                }
            }
        }
    }, {
        urls: ["<all_urls>"]
    }, ["blocking"]);

    chrome.webRequest.onHeadersReceived.addListener(makeHeaderHandler("response"), {
        urls: ["<all_urls>"]
    }, ["blocking", "responseHeaders"]);

    chrome.webRequest.onBeforeSendHeaders.addListener(makeHeaderHandler("request"), {
        urls: ["<all_urls>"]
    }, ["blocking", "requestHeaders"]);

    //init settings
    if (localStorage.devTools === undefined) {
        localStorage.devTools = "true";
    }
    if (localStorage.showSuggestions === undefined) {
        localStorage.showSuggestions = "true";
    }
    if (localStorage.showLogs === undefined) {
        localStorage.showLogs = "false";
    }
    function tokenize(str) {
        "use strict";
        var ans = str.split(/(\*+)/g);
        if (ans[0] === "") {
            ans.shift();
        }
        if (ans[ans.length - 1] === "") {
            ans.pop();
        }
        return ans;
    }

    function match(pattern, str) {
        "use strict";
        var patternTokens = tokenize(pattern);
        var freeVars = {};
        var varGroup;
        var strParts = str;
        var matchAnything = false;
        var completeMatch = patternTokens.every(function(token) {
            if (token.charAt(0) === "*") {
                matchAnything = true;
                varGroup = token.length;
                freeVars[varGroup] = freeVars[varGroup] || [];
            } else {
                var matches = strParts.split(token);
                if (matches.length > 1) {
                    // The token was found in the string.
                    var possibleFreeVar = matches.shift();
                    if (matchAnything) {
                        // Found a possible candidate for the *.
                        freeVars[varGroup].push(possibleFreeVar);
                    } else {
                        if (possibleFreeVar !== "") {
                            // But if we haven't seen a * for this freeVar,
                            // the string doesnt match the pattern.
                            return false;
                        }
                    }

                    matchAnything = false;
                    // We matched up part of the pattern to the string
                    // prepare to look at the next part of the string.
                    strParts = matches.join(token);
                } else {
                    // The token wasn't found in the string. Pattern doesn't match.
                    return false;
                }
            }
            return true;
        });

        if (matchAnything) {
            // If we still need to match a string part up to a star,
            // match the rest of the string.
            freeVars[varGroup].push(strParts);
        } else {
            if (strParts !== "") {
                // There is still some string part that didn't match up to the pattern.
                completeMatch = false;
            }
        }

        return {
            matched: completeMatch,
            freeVars: freeVars
        };
    }

    function replaceAfter(str, idx, match, replace) {
        "use strict";
        return str.substring(0, idx) + str.substring(idx).replace(match, replace);
    }

    function matchReplace(pattern, replacePattern, str) {
        "use strict";
        var matchData;
        if (pattern.matched !== undefined && pattern.freeVars !== undefined) {
            // accept match objects.
            matchData = pattern;
        } else {
            matchData = match(pattern, str);
        }

        if (!matchData.matched) {
            // If the pattern didn't match.
            return str;
        }

        // Plug in the freevars in place of the stars.
        var starGroups = replacePattern.match(/\*+/g) || [];
        var currentStarGroupIdx = 0;
        var freeVar;
        var freeVarGroup;
        starGroups.forEach(function(starGroup) {
            freeVarGroup = matchData.freeVars[starGroup.length] || [];
            freeVar = freeVarGroup.shift();
            freeVar = freeVar === undefined ? starGroup : freeVar;
            replacePattern = replaceAfter(replacePattern, currentStarGroupIdx, starGroup, freeVar);
            currentStarGroupIdx = replacePattern.indexOf(freeVar) + freeVar.length;
        });

        return replacePattern;
    }

    if (typeof module === "object" && module.exports) {
        module.exports = matchReplace;
    }

    // init domain storage
    // domainStorage.getAll().then(function(domains) {
    //     if (domains) {
    //         domains.forEach(function(domainObj) {
    //             ruleDomains[domainObj.id] = domainObj;
    //         });
    //     }
    // }).catch(simpleError);

})(); 
