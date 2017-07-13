## chrome-hosts

chrome-hosts 是一款便捷的 hosts + url rewrite 管理工具，通过读取当前目录下的 yaml 文件来启动具有指定 hosts + url rewrite 规则配置的 chrome 会话 - 并通过 `--load-extension` & `--user-data-dir` 参数让各 chrome 会话之间相互隔离，实现会话级别的 hosts 管理。

## 使用

### 安装

```
    npm install chrome-hosts
```

### 配置 url-hosts-config.yaml

```yaml
aliases:
  - &ResponseHeader
    Access-Control-Allow-Origin: "*"
hosts:
 beta:
  # beta
  - 192.168.0.1 *.auto-test.com,auto-test.com
 dev:
  # dev
  - 127.0.0.1 q.qunarzz.com,qunarzz.com,*.auto-test.com,auto-test.com
rewriteUrls:
  dev:
    - matchUrl: http://auto-test.com/*/src/html/*
      rules:
      - http://auto-test.com/destination/productList.do* http://searchtouch.qunar.com/destination/productList.do* xxxx
      - match: http://auto-test.com/queryData/searchCommentList.do*
        replace: http://searchtouch.qunar.com/queryData/searchCommentList.do*
        title: xxxx
      - match: http://searchtouch.qunar.com/*
        responseRules:
          <<: *ResponseHeader
        requestRules:
        # on: true
      - http://auto-test.com/stat.gif* http://searchtouch.qunar.com/stat.gif*
      - http://auto-test.com/queryData/searchSightDetail.do* http://search.qunar.com/queryData/searchSightDetail.do*
      # on: false
# ${var} is not valid yaml sytax
host:
  dev: http://auto-test.com/intention-search-h5-hy2/src/html/
  beta: http://auto-test.com/intention-search-h5-hy2/src/html/
  prod: http://auto-test.com/intention-search-h5-hy2/src/html/
baseUrl:
  dev: ${host}index.html 
  beta: ${host}index.html
  prod: ${host}index.html
baseUrlQreact:
  dev: ${host}qreact.html 
  beta: ${host}qreact.html
  prod: ${host}qreact.html
urls:
  - 首页 ${baseUrl}#place.summary?destination=上海
  - 首页2 ${baseUrlQreact}#place.detail?destination=上海
isMobile: true

```

### 启动 chrome

在项目目录下调用：

```
    # chrome-hosts -y [url-hosts-config.yaml] -d [dev|beta|prod] -u [urlToBrowse]
    chrome-hosts -u http://123.com
```
