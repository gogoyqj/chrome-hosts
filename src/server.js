/**
 * @description server in background, and launch chrome actually.
 */
const R     = require('ramda'),
    Koa     = require('koa'),
    { kill, launch } = require('./libs/chrome-launcher'),
    { PORT, SOCKET } = require('./config');
/**
 * @description start a server for launch request
 * @param {Object} options 
 */
const server = (options) => {
    const ws = require("nodejs-websocket")
    const reloadChrome = gid => {
        server.connections.forEach(function (connection) {
            if (connection.gid === gid) connection.sendText(JSON.stringify({action: 'reload'}))
        })
    }

    // Scream server example: "hi" -> "HI!!!"
    const server = ws.createServer(function (connection) {
        connection.gid = null;
        connection.on('text', function (str) {
            connection.gid = str;
        });
        connection.on('error', (e) => null);
    }).listen(SOCKET);

    let app = new Koa(),
        router = require('koa-router')(),
        koaBody = require('koa-body'),
        port = options.port || PORT;
    router
        .get('/check', (ctx) => {
            ctx.body = { err: 0 };
        })
        .get('/kill', (ctx) => {
            ctx.body = { err: 0, msg: 'kill server in 100ms.'};
            kill();
            setTimeout(process.exit, 100);
        })
        .post('/launch', koaBody(), (ctx) => {
            return launch(ctx.request.body).then((res) => {
                if (res && res.gid) {
                    reloadChrome(res.gid);
                }
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

// kill all chrome, since process.kill won't trigger
process.on('beforeExit', () => kill());

module.exports = {
    server
}