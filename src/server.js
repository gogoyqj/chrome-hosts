/**
 * @description server in background, and launch chrome actually.
 */
const Koa     = require('koa'),
    { kill, launch } = require('./libs/chrome-launcher'),
    { PORT, SOCKET, NEW, KILL } = require('./config'),
    WS = require('nodejs-websocket'),
    axios = require('axios'),
    cors = require('@koa/cors');;
/**
 * @description start a server for launch request
 * @param {Object} options 
 */
const server = (options) => {
    const MessagePool = {};
    const sendMessage = (gid, data = {}) => {
        if (gid) {
            let sended, send = connection => connection.sendText(JSON.stringify(data));
            server.connections.forEach(connection => {
                if (connection.gid === gid) {
                    sended = true;
                    send(connection);
                }
            });
            if (!sended) MessagePool[gid] = send;
        }
    };

    // Scream server example: "hi" -> "HI!!!"
    const server = WS.createServer(connection => {
        connection.gid = null;
        connection.on('text',  str => {
            try {
                let { gid, action } = JSON.parse(str);
                if (action === NEW) {
                    connection.gid = gid;
                    let send = MessagePool[gid];
                    if (send) {
                        send(connection);
                        delete MessagePool[gid];
                    }
                } else if (action === KILL) {
                    kill(gid);
                }
            } catch (e) {
                console.log(e);
            }
        });
        connection.on('error', () => null);
    }).listen(SOCKET);

    let app = new Koa(),
        router = require('koa-router')(),
        koaBody = require('koa-body'),
        port = options.port || PORT;

    app.use(cors());
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
            return launch(ctx.request.body).then((res = {}) => {
                let { gid, TYPE, url, json: { Cookie } } = res;
                sendMessage(gid, {
                    Cookie,
                    TYPE,
                    url
                });
                ctx.body = res;
            }, (err) => {
                console.warn(err.message);
                ctx.body = {
                    err: err.message
                };
            });
        })
        .post('/proxy', koaBody(), (ctx) => {
            const { body, query } = ctx.request;
            let { url, headers } = query;
            try {
                const headersArr = JSON.parse(headers);
                headers = {};
                headersArr
                    .forEach(({ name, value }) => {
                        headers[name] = value;
                    });
            } catch (e) {
                headers = {};
            }
            return axios
                .post(url, body, { headers })
                .then((res) => {
                    ctx.body = res.data;
                }, (err) => {
                    ctx.body = {
                        code: err.response.status,
                        message: err.response.statusText
                    };
                });
        })
        .get('*', (ctx) => {
            ctx.body = { err: "POST ONLY" };
        });
    app.use(router.middleware());
    app.listen(port);
};

// kill all chrome, since process.kill won't trigger
process.on('beforeExit', () => kill());

module.exports = {
    server
};