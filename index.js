#!/usr/bin/env node
/**
 * @description 函数式编程 Test
 * @author Skipper Young
 */
const R     = require('ramda'),
    fs      = require('fs'),
    path    = require('path'),
    yaml    = require('js-yaml'),
    program = require('commander'),
    Koa     = require('koa'),
    request = require('superagent'),
    child_process = require('child_process');

const NOOP = () => null;
const STORE = R.curry((map, key) => R.propOr('', key, map)); 
const VARS = R.memoize(STORE({
    __dirname,
    __filename,
    port: 8099,
    host: '127.0.0.1',
    cwd: process.cwd(),
    placeHolder: '@@__@@',
    encoding: { encoding: 'utf8' },
    useAsBin: require.main === module,
    timeout: { response: 2000, deadline: 2000 }
}));
const responder = R.curry(R.once((fn, options) => {
    return fn(options);
}));

const URL = (path) => 'http://' + VARS('host') + ':' + VARS('port') + PATH(path);
const PATH = (path) => path ? trimPath('/' + path) : '';
const trimRepeat = R.curry((repeat, string) => {
    return R.replace(new RegExp('[' + repeat + ']{2,}', 'g'), repeat, string);
});
const trimPath = trimRepeat('/');

const requester = R.curry((method, path, fn, data) => {
    let url = URL(path);
    // console.log(url)
    request[method](url)
        .timeout(VARS('timeout'))
        .send(data)
        .end(fn);
});
const checkStatus = R.curry((fn, err, data) => {
    fn(err || data.err, data && data.body)
})
const checkServer = fn => requester('get', 'check', checkStatus(fn), {});
const killServer = () => requester('get', 'kill', NOOP, {});
const launch = data => requester('post', 'launch', checkStatus((err) => {
    if (err) {
        console.log(err)
    }
}), data);
/**
 * @description send a request to launch server to launch chrome
 * @param {Object} options 
 */
const launchChrome = (options) => {
    let { yaml, deploy_type, url, mode } = options,
        data = {
            deploy_type,
            url,
            mode
        };
    let _yaml = path.isAbsolute(yaml) ? yaml : path.resolve(VARS('cwd'), yaml);
    if (!fs.existsSync(_yaml)) return console.log('ERRPR', yaml, 'NOT FOUND');
    data.yaml = fs.readFileSync(_yaml, VARS('encoding'));
    launch(data);
}

/**
 * @description start a server for launch request
 * @param {Object} options 
 */
const startSever = (options) => {
    let app = new Koa(),
        router = require('koa-router')(),
        koaBody = require('koa-body'),
        port = options.port;
    router
        .get('/check', (ctx) => {
            ctx.body = { err: 0 };
        })
        .get('/kill', (ctx) => {
            ctx.body = { err: 0, msg: 'kill server in 100ms.'};
            setTimeout(process.exit, 100);
        })
        .post('/launch', koaBody(), (ctx) => {
            return runRegression(ctx.request.body).then((res) => {
                ctx.body = res;
            }, (err) => {
                ctx.body = err;
            })
        }).get('*', (ctx) => {
            ctx.body = { err: "POST ONLY" };
        });
    app.use(router.middleware());
    app.listen(port);
}

program
    .version('0.0.1');

program
    .description('launch chrome with specified hosts')
    .option('-y,--yaml [value]', 'specify a yaml for auto regression, default is: url-hosts-config.yaml', 'url-hosts-config.yaml')
    .option('-d,--deploy_type [value]', 'specify deploy_type, can be: dev, beta or prod, determines which hosts to be used, default is: dev', 'dev')
    // .option('-m,--mode [value]', 'specify mode, if mode === browsing, just start the browser, default is: testing', 'testing')
    .option('-u, --url [value]', 'specify a url to open if mode === browsing', false)
    .option('-k, --kill [value]', 'kill server in background', false);
  
program
    .command('server')
    .description('start a server to response launch request')
    .option("-p, --port [port]", "Which port to use", VARS('port'))
    .action(responder(startSever));

program.parse(process.argv);
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});
if (VARS('useAsBin')) {
    responder((options) => {
        if (options.kill) return killServer();
        function startSeverInBackground(err, data) {
            if (err) {
                child_process.exec(VARS('__filename') + ' server>/dev/null 2>&1 &', (err) => {
                    if (err) return console.log(err);
                    let cnt = 0,
                        timer = setInterval(() => {
                            checkServer((err) => {
                                cnt++;
                                if (!err || cnt > 40) clearInterval(timer);
                                if (!err) launchChrome(options);
                            })
                        }, 200)
                });
            } else {
                launchChrome(options);
            }
        }
        checkServer(startSeverInBackground);
    }, program);
}

module.exports = {
    startSever,
    launchChrome
}