const { v4: uuidv4 } = require('uuid');
const { WebSocketServer } = require('ws');
const EventEmitter = require('events');
const dns = require("node:dns");
const { URL } = require("node:url");

const CONNECTION_STATES = {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3
};

const DEFAULT_CONFIG = {
    maxConnections: 1000,
    maxConnectionsPerIP: 10,
    pingInterval: 30000,
    pongTimeout: 5000,
    connectionTimeout: 30000,
    maxMessageSize: 1024 * 1024, // 1MB
    rateLimitWindow: 60000, // 1 minute
    rateLimitMaxMessages: 100
};

let connectionId = 0;
function generateId() {
    return ++connectionId;
}

class Client extends EventEmitter {
    constructor(ws, parent, id, ip) {
        super();
        this.ws = ws;
        this.parent = parent;
        this.id = id;
        this.ip = ip;
        this.isAlive = true;
        this.lastPing = Date.now();
        this.connectedAt = Date.now();
        this.messageCount = 0;
        this.lastMessageTime = 0;
        this.rateLimitMessages = [];
        this._functions = new Map();
        this._functionsBin = new Map();
        
        this.cleanup = this.cleanup.bind(this);
        this.heartbeatTimeout = null;
        this.rateLimitTimeout = null;
    }

    emitBinary(bin) {
        if (this.ws.readyState !== CONNECTION_STATES.OPEN) {
            console.warn(`Client ${this.id}: Attempting to send binary to closed connection`);
            return false;
        }
        try {
            this.ws.send(bin);
            return true;
        } catch (error) {
            console.error(`Client ${this.id}: Error sending binary:`, error);
            this.close();
            return false;
        }
    }

    emit(id1, ...data) {
        if (this.ws.readyState !== CONNECTION_STATES.OPEN) {
            console.warn(`Client ${this.id}: Attempting to send to closed connection`);
            return false;
        }

        try {
            const packet = [id1, data];
            const serialized = JSON.stringify(packet);
            
            if (serialized.length > this.parent.config.maxMessageSize) {
                console.warn(`Client ${this.id}: Message too large: ${serialized.length} bytes`);
                return false;
            }

            this.ws.send(serialized);
            return true;
        } catch (error) {
            console.error(`Client ${this.id}: Error sending message:`, error);
            this.close();
            return false;
        }
    }

    send(data) {
        if (this.ws.readyState !== CONNECTION_STATES.OPEN) {
            return false;
        }
        try {
            this.ws.send(data);
            return true;
        } catch (error) {
            console.error(`Client ${this.id}: Error sending raw data:`, error);
            this.close();
            return false;
        }
    }

    close(code = 1000, reason = 'Normal closure') {
        if (this.ws.readyState === CONNECTION_STATES.CLOSED) {
            return;
        }
        
        try {
            this.ws.close(code, reason);
        } catch (error) {
            console.error(`Client ${this.id}: Error closing connection:`, error);
        }
        
        this.cleanup();
    }

    terminate() {
        try {
            this.ws.terminate();
        } catch (error) {
            console.error(`Client ${this.id}: Error terminating connection:`, error);
        }
        this.cleanup();
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

    isRateLimited() {
        const now = Date.now();
        const window = this.parent.config.rateLimitWindow;
        const maxMessages = this.parent.config.rateLimitMaxMessages;

        this.rateLimitMessages = this.rateLimitMessages.filter(time => now - time < window);
        
        if (this.rateLimitMessages.length >= maxMessages) {
            return true;
        }

        this.rateLimitMessages.push(now);
        return false;
    }

    cleanup() {
        if (this.heartbeatTimeout) {
            clearTimeout(this.heartbeatTimeout);
            this.heartbeatTimeout = null;
        }
        
        if (this.rateLimitTimeout) {
            clearTimeout(this.rateLimitTimeout);
            this.rateLimitTimeout = null;
        }
        
        this._functions.clear();
        this._functionsBin.clear();
        this.rateLimitMessages = [];
        
        this.removeAllListeners();
    }

    getConnectionInfo() {
        return {
            id: this.id,
            ip: this.ip,
            connectedAt: this.connectedAt,
            isAlive: this.isAlive,
            messageCount: this.messageCount,
            uptime: Date.now() - this.connectedAt,
            readyState: this.ws.readyState
        };
    }
}

class WebSocket extends EventEmitter {
    constructor(server, options = {}) {
        super();
        
        this.config = { ...DEFAULT_CONFIG, ...options };
        this.server = server;
        this.clients = new Map();
        this.connectedIPs = new Map();
        this.isShuttingDown = false;
        
        this._auth = () => true;
        this._onupgrade = () => true;
        this._connectionHandlers = [];
        
        this.wss = new WebSocketServer({ 
            noServer: true, 
            clientTracking: false,
            maxPayload: this.config.maxMessageSize
        });

        this.opts = {
            path: this.config.path || '/',
            cors: this.config.cors || [],
            strictCORS: this.config.strictCORS !== false,
        };

        this.setupHeartbeat();
        this.setupGracefulShutdown();
        this.setupConnectionHandler();
        
        console.log(`WebSocket server initialized with config:`, {
            maxConnections: this.config.maxConnections,
            maxConnectionsPerIP: this.config.maxConnectionsPerIP,
            pingInterval: this.config.pingInterval,
            cors: this.opts.cors
        });
    }

    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isShuttingDown) return;
            
            const deadClients = [];
            const now = Date.now();
            
            this.clients.forEach((client, id) => {
                if (!client.isAlive) {
                    deadClients.push(id);
                    return;
                }
                
                if (now - client.lastPing > this.config.connectionTimeout) {
                    console.warn(`Client ${id}: Connection timeout`);
                    deadClients.push(id);
                    return;
                }
                
                if (client.ws.readyState === CONNECTION_STATES.OPEN) {
                    client.isAlive = false;
                    client.lastPing = now;
                    
                    try {
                        client.ws.ping();
                    } catch (error) {
                        console.error(`Client ${id}: Error sending ping:`, error);
                        deadClients.push(id);
                    }
                }
            });
            
            deadClients.forEach(id => {
                const client = this.clients.get(id);
                if (client) {
                    console.log(`Removing dead client ${id}`);
                    this.destroyClient(client, true);
                }
            });
            
        }, this.config.pingInterval);
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            console.log('WebSocket server shutting down gracefully...');
            this.isShuttingDown = true;
            
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
                this.heartbeatInterval = null;
            }
            
            this.clients.forEach(client => {
                client.close(1001, 'Server shutting down');
            });
            
            setTimeout(() => {
                this.clients.forEach(client => {
                    client.terminate();
                });
                this.wss.close();
            }, 5000);
        };
        
        process.once('SIGTERM', shutdown);
        process.once('SIGINT', shutdown);
        process.once('SIGUSR2', shutdown); // nodemon restart
    }

    setupConnectionHandler() {
        this.server.on("upgrade", (req, socket, head) => {
            this.handleUpgrade(req, socket, head);
        });

        this.wss.on("connection", (ws, req) => {
            this.handleConnection(ws, req);
        });
    }

    handleUpgrade(req, socket, head) {
        try {
            if (this.isShuttingDown) {
                socket.destroy();
                return;
            }

            if (!this._onupgrade(req, socket)) {
                socket.destroy();
                return;
            }

            const ip = this.getClientIP(req);
            
            if (this.clients.size >= this.config.maxConnections) {
                console.warn(`Connection rejected: Max connections reached (${this.config.maxConnections})`);
                socket.destroy();
                return;
            }

            const ipConnections = this.connectedIPs.get(ip) || 0;
            if (ipConnections >= this.config.maxConnectionsPerIP) {
                console.warn(`Connection rejected: IP ${ip} has ${ipConnections} connections (max: ${this.config.maxConnectionsPerIP})`);
                socket.destroy();
                return;
            }

            if (!this.validateOrigin(req)) {
                socket.destroy();
                return;
            }

            if (!this._auth(req)) {
                socket.destroy();
                return;
            }

            this.wss.handleUpgrade(req, socket, head, (ws) => {
                this.wss.emit("connection", ws, req);
            });

        } catch (error) {
            console.error('Error handling upgrade:', error);
            socket.destroy();
        }
    }

    handleConnection(ws, req) {
        try {
            const ip = this.getClientIP(req);
            const id = generateId();
            
            const client = new Client(ws, this, id, ip);
            this.clients.set(id, client);
            
            this.connectedIPs.set(ip, (this.connectedIPs.get(ip) || 0) + 1);
            
            this.bindClientEvents(client);
            
            this._connectionHandlers.forEach(handler => {
                try {
                    handler(client);
                } catch (error) {
                    console.error(`Error in connection handler:`, error);
                }
            });
            
            console.log(`Client ${id} connected from ${ip}. Total connections: ${this.clients.size}`);
            this.emit('connection', client);
            
        } catch (error) {
            console.error('Error handling connection:', error);
            ws.terminate();
        }
    }

    getClientIP(req) {
        let ip = req.headers['x-forwarded-for'] || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                (req.connection.socket ? req.connection.socket.remoteAddress : null);
        
        if (process.env.NODE_ENV === "development") {
            ip = "127.0.0.1";
        }
        
        if (ip && ip.includes(',')) {
            ip = ip.split(',')[0].trim();
        }
        
        return ip || 'unknown';
    }

    validateOrigin(req) {
        const origin = req.headers.origin;
        
        if (!origin) {
            if (this.opts.strictCORS) {
                console.warn('Connection rejected: No origin header');
                return false;
            }
            return true;
        }

        if (this.opts.cors.length === 0) {
            return true;
        }

        try {
            const originHost = new URL(origin).host;
            const isAllowed = this.opts.cors.includes(originHost);
            
            if (!isAllowed) {
                console.warn(`Connection rejected: Origin ${originHost} not in CORS whitelist`);
            }
            
            return isAllowed;
        } catch (error) {
            console.warn(`Connection rejected: Invalid origin ${origin}`);
            return false;
        }
    }
    bindClientEvents(client) {
        const ws = client.ws;
        const id = client.id;

        ws.removeAllListeners();

        ws.on("pong", () => {
            const clientObj = this.clients.get(id);
            if (clientObj) {
                clientObj.isAlive = true;
                clientObj.lastPing = Date.now();
            }
        });

        ws.on("error", (error) => {
            console.error(`Client ${id}: WebSocket error:`, error);
            this.destroyClient(client, true);
        });

        ws.on("message", (data) => {
            try {
                const clientObj = this.clients.get(id);
                if (!clientObj) return;

                if (clientObj.isRateLimited()) {
                    console.warn(`Client ${id}: Rate limited`);
                    clientObj.close(1008, 'Rate limit exceeded');
                    return;
                }

                clientObj.messageCount++;

                if (data.length > this.config.maxMessageSize) {
                    console.warn(`Client ${id}: Message too large: ${data.length} bytes`);
                    clientObj.close(1009, 'Message too large');
                    return;
                }

                let packet;
                let isBinary = false;

                try {
                    if (Buffer.isBuffer(data)) {
                        isBinary = true;
                        if (data.length > 0) {
                            const handler = clientObj._functionsBin.get(data[0]);
                            if (handler) {
                                handler.call(clientObj, data);
                            }
                        }
                        return;
                    }

                    packet = JSON.parse(data.toString());
                } catch (parseError) {
                    console.warn(`Client ${id}: Invalid JSON message`);
                    return;
                }

                if (!Array.isArray(packet) || packet.length !== 2) {
                    console.warn(`Client ${id}: Invalid packet format`);
                    return;
                }

                const [eventId, eventData] = packet;
                const handler = clientObj._functions.get(eventId);
                
                if (handler) {
                    if (Array.isArray(eventData)) {
                        handler.call(clientObj, ...eventData);
                    } else {
                        handler.call(clientObj, eventData);
                    }
                }

            } catch (error) {
                console.error(`Client ${id}: Error processing message:`, error);
            }
        });

        ws.on("close", (code, reason) => {
            console.log(`Client ${id}: Connection closed. Code: ${code}, Reason: ${reason}`);
            
            const clientObj = this.clients.get(id);
            if (clientObj) {
                const closeHandler = clientObj._functions.get('close');
                if (closeHandler) {
                    try {
                        closeHandler.call(clientObj, code, reason.toString());
                    } catch (error) {
                        console.error(`Client ${id}: Error in close handler:`, error);
                    }
                }
            }

            this.destroyClient(client, false);
        });
    }

    destroyClient(client, disconnect = true) {
        const ip = client.ip;
        const id = client.id;

        if (!this.clients.has(id)) {
            return;
        }

        try {
            if (disconnect && client.ws.readyState !== CONNECTION_STATES.CLOSED) {
                client.ws.removeAllListeners();
                client.ws.terminate();
            }

            client.cleanup();

            this.clients.delete(id);

            const ipCount = this.connectedIPs.get(ip) || 0;
            if (ipCount <= 1) {
                this.connectedIPs.delete(ip);
            } else {
                this.connectedIPs.set(ip, ipCount - 1);
            }

            console.log(`Client ${id} destroyed. Total connections: ${this.clients.size}`);
            this.emit('disconnection', client);

        } catch (error) {
            console.error(`Error destroying client ${id}:`, error);
        }
    }

    auth(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Auth callback must be a function');
        }
        this._auth = callback;
        return this;
    }

    onUpgrade(callback) {
        if (typeof callback !== 'function') {
            throw new Error('OnUpgrade callback must be a function');
        }
        this._onupgrade = callback;
        return this;
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

    getConnectionsByIP() {
        return Object.fromEntries(this.connectedIPs);
    }

    emit(eventId, ...data) {
        if (this.clients.size === 0) return 0;
        
        const packet = JSON.stringify([eventId, data]);
        let sent = 0;
        
        this.clients.forEach(client => {
            if (client.send(packet)) {
                sent++;
            }
        });
        
        return sent;
    }

    emitBinary(data) {
        if (this.clients.size === 0) return 0;
        
        let sent = 0;
        this.clients.forEach(client => {
            if (client.emitBinary(data)) {
                sent++;
            }
        });
        
        return sent;
    }

    close() {
        console.log('Closing WebSocket server...');
        this.isShuttingDown = true;
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        const closePromises = Array.from(this.clients.values()).map(client => {
            return new Promise(resolve => {
                client.close(1001, 'Server closing');
                setTimeout(resolve, 1000);
            });
        });
        
        return Promise.all(closePromises).then(() => {
            this.wss.close();
            this.removeAllListeners();
        });
    }

    getServerStats() {
        const now = Date.now();
        const stats = {
            totalConnections: this.clients.size,
            connectionsByIP: Object.fromEntries(this.connectedIPs),
            config: this.config,
            uptime: now - (this.startTime || now),
            isShuttingDown: this.isShuttingDown
        };

        const clientStats = Array.from(this.clients.values()).map(client => 
            client.getConnectionInfo()
        );

        return { ...stats, clients: clientStats };
    }
}

module.exports = WebSocket;
