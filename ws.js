const { v4: uuidv4 } = require('uuid');
const { WebSocketServer } = require('ws');
const dns = require("node:dns");
const { URL } = require("node:url");

//assume there arent 50k clients at once
const max_id = 50000;
let cur_id = 100;
function idgen() {
    if(cur_id >= max_id) cur_id = 0;
    cur_id++;
    console.log(cur_id);
    return cur_id;
}

/*
TODO:
-binary format
*/

class Client {
    constructor(ws, parent, id, ip) {
        this.ws = ws;
        this.parent = parent;
        this.paused = false;
        this.id = id;
        this.isAlive = true;
        this.ip = ip;
        this._functions = {};
        this._functionsBin = {};
    }
    emitBinary(bin) {
        this.ws.send(bin);
    }
    emit(id1, ...data) {
        let packet = [id1, new Array(data.length)];
        let l = data.length;
        for (let i = 0; i < l; i++)
            packet[1][i] = data[i];
        this.ws.send(JSON.stringify(packet));
    }
    send(data) {
        this.ws.send(data);
    }
    close() {
        this.ws.close();
    }
    on(id1, callback) {
        this._functions[id1] = callback;
    }
    bin(id, callback) {
        this._functionsBin[id] = callback;
    }
}

class WebSocket {
    constructor(server, options) {
        this.wss = new WebSocketServer({ noServer: true, clientTracking: false });
        this._functions = {};
        this.clients = {};
        this.server = server;
        this._auth = () => { return true; };
        this._onupgrade = () => { return true; };
        this._on = [];
        this.opts = {
            path: options?.path ?? '/',
            cors: options?.cors ?? [],
            strictCORS: options?.strictCORS ?? true,
            bandwidthUsage: {
                measure: options?.bandwidthUsage ?? false,
                bytesSent: 0,
            },
            IPlimit: options?.IPlimit ?? 100
        }
        this.connectedIPs = {};
        /*for (let i in this.opts.cors) {
          dns.lookup(this.opts.cors[i], (err, address) => {
            console.log(address);
            this.opts.cors[i] = address;
          });
        }*/

        this.ping = setInterval(() => {
            for (let i in this.clients) {
                if (!this.clients[i].isAlive) {
                    console.log("terminated");
                    this.clients[i]._functions?.close(100, "", true);
                    this.destroyClient(this.clients[i], true);
                    delete this.clients[i];
                    continue;
                }
                this.clients[i].isAlive = false;
                this.clients[i].ws.ping();
            }
        }, 20000);

        server.on("upgrade", (req, socket, head) => {
            let url = req.url;

            if (!this._onupgrade(req, socket)) {
                return;
            }
            let ip = req.headers['x-forwarded-for'];
            if (true || process.env.NODE_ENV == "development") {
                ip = "127.0.0.1";
            }
            if (this.connectedIPs[ip] >= this.opts.IPlimit || ip.includes(",")) {
                socket.destroy();
                return;
            }
            if (this.connectedIPs[ip] == null) {
                this.connectedIPs[ip] = 1;
            } else {
                this.connectedIPs[ip]++;
            }

            let end = () => {
                //authentication
                if (!this._auth(req)) {
                    socket.destroy();
                    return;
                }
                this.wss.handleUpgrade(req, socket, head, (ws) => {
                    this.wss.emit("connection", ws, req);
                });


            }
            //CORS same origin websocket connections only
            let origin = req && req.headers && req.headers.origin;

            if (origin == undefined) {
                socket.destroy();
                return;
            }

            if (origin != null && origin != "null") {
                try {
                    origin = new URL(origin).host;
                } catch (e) {
                    socket.destroy();
                    return;
                }
                if (!this.opts.cors.includes(origin) && this.opts.cors.length > 0) {
                    socket.destroy();
                    return;
                }
                end();
                /*
                dns.lookup(origin, (err, address) => {
                  console.log(address);
                  for (let i in this.opts.cors) {
                    if (address != this.opts.cors[i]) {
                      socket.destroy();
                      return;
                    }
                  }
                  end();
                });*/
            } else {
                if (!this.opts.strictCORS)
                    end();
            }

        });
        //WebSocket.servers.push(this);
        this.wss.on("connection", (ws, req) => {
            let ip = req.headers['x-forwarded-for'];
            let id = idgen();
            this.clients[id] = new Client(ws, this, id, ip);
            this.bindClient(this.clients[id]);
            this.bindEvents(this.clients[id]);
        });
    }
    copy(server) {
        this._functions = server._functions;
    }
    bindClient(client) {
        let ws = client.ws;
        let id = client.id;
        let ip = client.ip;
        ws.removeAllListeners("pong");
        ws.removeAllListeners("error");
        ws.removeAllListeners("message");
        ws.removeAllListeners("close");

        ws.on("pong", () => {
            this.clients[id].isAlive = true;
        });
        ws.on("error", () => { });
        ws.on("message", (pack) => {
            try {
                pack = JSON.parse(pack);
            } catch (e) {
                if (pack[0] in this.clients[id]._functionsBin)
                    this.clients[id]._functionsBin[pack[0]](pack);
                return;
            }
            if (!Array.isArray(pack) || pack.length !== 2) {
                //ws.terminate();
                return;
            }
            let id1 = pack[0];
            let data = pack[1];
            if (!(id1 in this.clients[id]._functions)) return;
            try {
                if (!Array.isArray(data)) return;
                this.clients[id]._functions[id1](...data);
            } catch (e) { console.log(e); }
        });
        ws.on("close", (code, reason) => {
            let terminate = true;

            if (!(id in this.clients)) {
                console.log("wtf " + id);
                ws.terminate();
                return;
            }

            if (code == 3333 || code == 1006) terminate = false;
            if (!this.clients[id].isAlive) terminate = true;

            if (this.clients[id]._functions?.close)
                this.clients[id]._functions?.close(code, reason, terminate);

            this.clients[id].ws.removeAllListeners("close");
            if (terminate)
                this.destroyClient(this.clients[id], true);
        });
    }
    destroyClient(client, disconnect = true) {
        let ip = client.ip;
        let id = client.id;

        this.connectedIPs[ip]--;
        if (this.connectedIPs[ip] == 0) {
            delete this.connectedIPs[ip];
        }
        if (disconnect) {
            this.clients[id].ws.removeAllListeners("close");
            this.clients[id].ws.terminate(1005);
        }
        delete this.clients[id];

        console.log("disconnecetd " + id);
    }
    bindEvents(client) {
        for (let i in this._on) {
            this._on[i](client);
        }
    }
    auth(callback) {
        this._auth = callback;
    }
    on(connection, callback) {
        this._on.push(callback);
    }
    getTotalClients() {
        return Object.keys(this.clients).length;
    }
    emit(id, ...data) {
        let packet = [id, new Array(data.length)];
        let l = data.length;
        for (let i = 0; i < l; i++)
            packet[1][i] = data[i];
        packet = JSON.stringify(packet);
        for (let i in this.clients)
            this.clients[i].ws.send(packet);
    }
    emitBinary(bin) {
        for (let i in this.clients)
            this.clients[i].ws.send(bin);
    }
}
WebSocket.servers = [];

module.exports = WebSocket;
