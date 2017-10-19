## chrome-hosts

chrome-hosts 是一款便捷的 hosts + url rewrite 管理工具，通过读取当前目录下的 yaml 文件来启动具有指定 hosts + url rewrite 规则配置的 chrome 会话 - 并通过 `--load-extension` & `--user-data-dir` 参数让各 chrome 会话之间相互隔离，实现会话级别的 hosts 管理。

## 使用

### 安装

```
    npm install -g chrome-hosts
```

### 配置 url-hosts-config.yaml

```yaml
  hosts:
    # required，不指定有个卵用
  rewriteUrls:
    # not required
  urls:
    # not required，如果不需要自动打开
  isMobile:
    # 如果指定了 isMobile: true，则会将 UA 设置为 iPhone 6，且制动打开调试工具
  Cookie:
    # 自动设置 cookie 到 打开的 url
    xxx=xxx;xxx=xxx
    # 或通过 @ 语法， 取 123.sogou.com 域下 Cookie 复制到当前打开的 url 下，注意：不能保证完全同步
    @123.sogou.com
  rewriteUrls:
  dev:
    - matchUrl: http://123.sogou.com/*
      rules:
        - match: http://searchtouch.qunar.com/*
          requestRules:
            Cookie: "@123.sogou.com" # Cookie 的获取为异步，所以赞不支持 @
            Host: "@" # 取当前请求的 hostname
            Origin: "@" # 取当前请求 url
            Referer: "@" # 取当前请求 url
```

```yaml
aliases:
  - &ResponseHeader
    Access-Control-Allow-Origin: "*"
  - &requestRules:
    Cookie: "@123.sogou.com" # Cookie 的获取为异步，所以赞不支持 @
    Host: "@" # 取当前请求的 hostname
    Origin: "@" # 取当前请求 url
    Referer: "@" # 取当前请求 url
Cookie:
    "@123.sogou.com" # 取 123.sogou.com 域下 Cookie 复制到当前打开的 url 下，注意：不能保证完全同步
hosts:
 beta:
  # beta
  - 127.0.0.1:8088 *.dh.123.sogou.com,*.sogou.com
 dev:
  # dev
  - 127.0.0.1 *.dh.123.sogou.com,dh.123.sogou.com,123.sogou.com,*.sogou.com,*.hao123.com
rewriteUrls:
  dev:
    - matchUrl: http://123.sogou.com/*
      rules:
      - http://123.sogou.com/destination/productList.do* http://searchtouch.qunar.com/destination/productList.do* xxxx
      - match: http://123.sogou.com/queryData/searchCommentList.do*
        replace: http://searchtouch.qunar.com/queryData/searchCommentList.do*
        title: xxxx
      - match: http://searchtouch.qunar.com/*
        responseRules:
          <<: *ResponseHeader
        requestRules:
        # on: true
      - http://123.sogou.com/stat.gif* http://searchtouch.qunar.com/stat.gif*
      - http://123.sogou.com/queryData/searchSightDetail.do* http://search.qunar.com/queryData/searchSightDetail.do*
      # on: false
# ${var} is not valid yaml sytax
host:
  dev: http://123.sogou.com/
  beta: http://123.sogou.com/
  prod: http://123.sogou.com/
baseUrl:
  dev: ${host}index.html 
  beta: ${host}index.html
  prod: ${host}index.html
baseUrlQreact:
  dev: ${host}qreact.html 
  beta: ${host}qreact.html
  prod: ${host}qreact.html
urls:
  - 首页 ${baseUrl}
  - 首页2 ${baseUrlQreact}
isMobile: true
```

### 启动 chrome

在项目目录下调用：

```
    # chrome-hosts -y [url-hosts-config.yaml] -d [dev|beta|prod] -u [urlToBrowser]
    # -y 指定配置 yaml 文件
    # -d 指定读取配置的分类，默认为 dev
    # -u 指定打开 url，默认读取配置内 urls 第一个值
    chrome-hosts
```

查看 hosts 配置:

```
  # 在 url 输入框内输输入：
  dumphosts
```

注意：查看到的 hosts 配置并不会实时更新，如需查看变更后的 hosts 需要重新操作
