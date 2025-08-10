const uWS = require('uWebSockets.js');
const EventEmitter = require('events');

const DEFAULT_CONFIG = {
    maxConnections: 10000,
    maxConnectionsPerIP: 50,
    pingInterval: 30000,
    maxMessageSize: 1024 * 1024,
    rateLimitWindow: 60000,
    rateLimitMaxMessages: 200
};

let connectionId = 0;
function generateId() {
    return ++connectionId;
}

class Client {
    constructor(ws, parent, id, ip) {
        this.ws = ws;
        this.parent = parent;
        this.id = id;
        this.ip = ip;
        this.isAlive = true;
        this.lastPing = Date.now();
        this.connectedAt = Date.now();
        this.messageCount = 0;
        this.rateLimitMessages = [];
        this._functions = new Map();
        this._functionsBin = new Map();
        
        ws.clientId = id;
        ws.client = this;
    }

    emitBinary(bin) {
        try {
            const result = this.ws.send(bin, uWS.OPCODE_BINARY);
            return result === 1;
        } catch (error) {
            return false;
        }
    }

    emit(id1, ...data) {
        try {
            let packet = [id1, new Array(data.length)];
            for (let i = 0; i < data.length; i++)
                packet[1][i] = data[i];
            
            const serialized = JSON.stringify(packet);
            const result = this.ws.send(serialized, uWS.OPCODE_TEXT);
            return result === 1;
        } catch (error) {
            return false;
        }
    }

    send(data) {
        try {
            const result = this.ws.send(data, uWS.OPCODE_TEXT);
            return result === 1;
        } catch (error) {
            return false;
        }
    }

    close(code = 1000, reason = 'Normal closure') {
        try {
            this.ws.close();
        } catch (error) {
            // Ignore close errors
        }
    }

    on(id1, callback) {
        this._functions.set(id1, callback);
    }

    off(id1) {
        this._functions.delete(id1);
    }

    bin(id, callback) {
        this._functionsBin.set(id, callback);
    }

    offBin(id) {
        this._functionsBin.delete(id);
    }

    cleanup() {
        this._functions.clear();
        this._functionsBin.clear();
        this.rateLimitMessages = [];
    }
}

class WebSocket extends EventEmitter {
    constructor(server, options = {}) {
        super();
        
        this.config = { ...DEFAULT_CONFIG, ...options };
        this.httpServer = server;
        this.clients = new Map();
        this.connectedIPs = new Map();
        this.isShuttingDown = false;
        this._connectionHandlers = [];
        
        this.port = server.address()?.port || 3000;
        
        // Create standalone uWS app
        this.uwsApp = uWS.App({}).ws('/*', {
            message: (ws, message, opCode) => this.handleMessage(ws, message, opCode),
            open: (ws) => this.handleOpen(ws),
            close: (ws, code, message) => this.handleClose(ws, code, message),
            pong: (ws) => this.handlePong(ws),
            maxMessageSize: this.config.maxMessageSize,
            compression: uWS.SHARED_COMPRESSOR,
        }).listen(this.port + 1, (token) => {
            if (token) {
                console.log(`uWS listening on port ${this.port + 1}`);
            } else {
                console.error('Failed to start uWS server');
            }
        });

        this.setupHeartbeat();
        this.setupGracefulShutdown();
        
        console.log(`uWebSocket server initialized for ${this.config.maxConnections} connections`);
    }

    handleOpen(ws) {
        const id = generateId();
        const ip = ws.getRemoteAddressAsText ? Buffer.from(ws.getRemoteAddressAsText()).toString() : 'unknown';
        
        // Check limits
        if (this.clients.size >= this.config.maxConnections) {
            ws.close();
            return;
        }

        const ipConnections = this.connectedIPs.get(ip) || 0;
        if (ipConnections >= this.config.maxConnectionsPerIP) {
            ws.close();
            return;
        }
        
        const client = new Client(ws, this, id, ip);
        this.clients.set(id, client);
        this.connectedIPs.set(ip, ipConnections + 1);
        
        console.log(`Client ${id} connected. Total: ${this.clients.size}`);
        
        this._connectionHandlers.forEach(handler => {
            try {
                handler(client);
            } catch (error) {
                console.error('Error in connection handler:', error);
            }
        });
        
        super.emit('connection', client);
    }

    handleMessage(ws, message, opCode) {
        const client = ws.client;
        if (!client) return;

        client.messageCount++;

        try {
            if (opCode === uWS.OPCODE_BINARY) {
                const data = new Uint8Array(message);
                if (data.length > 0) {
                    const handler = client._functionsBin.get(data[0]);
                    if (handler) {
                        handler(data);
                    }
                }
                return;
            }

            const messageStr = Buffer.from(message).toString();
            if (!messageStr.startsWith('[')) return;

            const packet = JSON.parse(messageStr);
            if (!Array.isArray(packet) || packet.length !== 2) return;

            const [eventId, eventData] = packet;
            const handler = client._functions.get(eventId);
            
            if (handler) {
                if (Array.isArray(eventData)) {
                    handler(...eventData);
                } else {
                    handler(eventData);
                }
            }

        } catch (error) {
            console.error(`Client ${client.id}: Message error:`, error);
        }
    }

    handleClose(ws, code, message) {
        const client = ws.client;
        if (!client) return;

        console.log(`Client ${client.id}: Closed (${code})`);
        
        const closeHandler = client._functions.get('close');
        if (closeHandler) {
            try {
                closeHandler(code, Buffer.from(message).toString());
            } catch (error) {
                console.error('Close handler error:', error);
            }
        }

        this.destroyClient(client);
    }

    handlePong(ws) {
        const client = ws.client;
        if (client) {
            client.isAlive = true;
            client.lastPing = Date.now();
        }
    }

    destroyClient(client) {
        const ip = client.ip;
        const id = client.id;

        if (!this.clients.has(id)) return;

        client.cleanup();
        this.clients.delete(id);

        const ipCount = this.connectedIPs.get(ip) || 0;
        if (ipCount <= 1) {
            this.connectedIPs.delete(ip);
        } else {
            this.connectedIPs.set(ip, ipCount - 1);
        }

        console.log(`Client ${id} destroyed. Total: ${this.clients.size}`);
        super.emit('disconnection', client);
    }

    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isShuttingDown) return;
            
            const deadClients = [];
            
            this.clients.forEach((client, id) => {
                if (!client.isAlive) {
                    deadClients.push(id);
                    return;
                }
                
                client.isAlive = false;
                client.lastPing = Date.now();
                
                try {
                    client.ws.ping();
                } catch (error) {
                    deadClients.push(id);
                }
            });
            
            deadClients.forEach(id => {
                const client = this.clients.get(id);
                if (client) {
                    this.destroyClient(client);
                }
            });
            
        }, this.config.pingInterval);
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            console.log('Shutting down uWS server...');
            this.isShuttingDown = true;
            
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            this.clients.forEach(client => {
                client.close();
            });
            
            if (this.uwsApp) {
                uWS.us_listen_socket_close(this.uwsApp);
            }
        };
        
        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);
        process.once('SIGUSR2', shutdown);
    }

    on(event, callback) {
        if (event === 'connection') {
            this._connectionHandlers.push(callback);
            return this;
        }
        return super.on(event, callback);
    }

    getTotalClients() {
        return this.clients.size;
    }

    broadcast(eventId, ...data) {
        if (this.clients.size === 0) return 0;
        
        let packet = [eventId, new Array(data.length)];
        for (let i = 0; i < data.length; i++)
            packet[1][i] = data[i];
        
        const serialized = JSON.stringify(packet);
        let sent = 0;
        
        this.clients.forEach(client => {
            if (client.send(serialized)) {
                sent++;
            }
        });
        
        return sent;
    }

    emit(eventId, ...data) {
        return this.broadcast(eventId, ...data);
    }

    emitBinary(data) {
        let sent = 0;
        this.clients.forEach(client => {
            if (client.emitBinary(data)) {
                sent++;
            }
        });
        return sent;
    }
}

module.exports = WebSocket;