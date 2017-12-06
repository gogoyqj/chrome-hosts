#!/usr/bin/env node
/**
 * @description 函数式编程 Test
 * @author Skipper Young
 */
const R = require('ramda'),
    program = require('commander'),
    { PORT } = require('./config');

process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

const UseAsBin = require.main === module;
const { client, launchChrome } = require('./client');
const { server } = require('./server');
const responder = R.curry(R.once((fn, options) => fn(options)));


program
    .version(require('../package.json').version);

program
    .description('launch chrome with specified hosts')
    .option('-y,--yaml [value]', 'specify a yaml for auto launch, default is: url-hosts-config.yaml', 'url-hosts-config.yaml')
    .option('-d,--deploy_type [value]', 'specify deploy_type, can be: dev, beta or prod, determines which hosts to be used, default is: dev', 'dev')
    // .option('-m,--mode [value]', 'specify mode, if mode === browsing, just start the browser, default is: testing', 'testing')
    .option('-u, --url [value]', 'specify a url to open', false)
    .option('-k, --kill [value]', 'kill server in background', false);
  
program
    .command('server')
    .description('start a server to response launch request, attention: you just need not start server manually.')
    .option("-p, --port [port]", "Which port to use", PORT)
    .action(responder(server));

program.parse(process.argv);
if (UseAsBin) {
    responder(client, program);
}

module.exports = {
    server,
    client,
    launchChrome
};
