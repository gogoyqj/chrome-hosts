module.exports = {
    DIR: __dirname,
    TMPDIR: process.env.TMPDIR,
    SOCKET: 8001,
    PORT: 8002,
    HOST: '127.0.0.1',
    CWD: process.cwd(),
    ENCODING: { encoding: 'utf8' },
    TIMEOUT: { response: 2000, deadline: 2000 },
    NEW: "NEW",
    CREATED: "CREATED",
    KILL: "KILL"
};