export default class SocketWrapper {
  constructor(url, protocols, opts = {}) {
    this._funcs = new Map();
    this._funcsBin = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = opts.maxReconnectAttempts || 2;
    this.reconnectDelay = opts.reconnectDelay || 2000;
    this.isReconnecting = false;
    this.shouldReconnect = true;
    this.lastMessageTime = Date.now();
    this.connectionTimeout = opts.connectionTimeout || 10000;
    this.messageQueue = [];
    this.isConnected = false;
    
    this._funcs.set('open', opts.open || (() => {}));
    this._funcs.set('close', opts.close || (() => {}));
    this._funcs.set('error', opts.error || (() => {}));
    
    this._setupSocket(url, protocols, opts);
  }
  _setupSocket(url, protocols, opts) {
    if (this.ws) {
      this.ws.removeEventListener('open', this._handleOpen);
      this.ws.removeEventListener('close', this._handleClose);
      this.ws.removeEventListener('error', this._handleError);
      this.ws.removeEventListener('message', this._handleMessage);
      this.ws.close();
    }

    this.url = url || this._generateURL();
    this.protocols = protocols || [];
    this.opts = opts;

    try {
      this.ws = new WebSocket(this.url, this.protocols);
      this.ws.binaryType = "arraybuffer";

      this._handleOpen = (e) => this._onOpen(e);
      this._handleClose = (e) => this._onClose(e);
      this._handleError = (e) => this._onError(e);
      this._handleMessage = (e) => this._onMessage(e);

      this.ws.addEventListener("open", this._handleOpen);
      this.ws.addEventListener("close", this._handleClose);
      this.ws.addEventListener("error", this._handleError);
      this.ws.addEventListener("message", this._handleMessage);

      this.connectionTimer = setTimeout(() => {
        if (this.ws.readyState !== WebSocket.OPEN) {
          console.warn('Connection timeout');
          this.ws.close();
        }
      }, this.connectionTimeout);

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this._scheduleReconnect();
    }
  }

  _generateURL() {
    let proto = location.protocol.match(/https/) ? "wss://" : "ws://";
    return proto + location.host + location.pathname + location.search;
  }

  _onOpen(e) {
    console.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.isReconnecting = false;

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    this._flushMessageQueue();

    const openHandler = this._funcs.get('open');
    if (openHandler) {
      try {
        openHandler(e, this.opts.join);
      } catch (error) {
        console.error('Error in open handler:', error);
      }
    }
  }

  _onClose(e) {
    console.log(`WebSocket closed: ${e.code} ${e.reason}`);
    this.isConnected = false;

    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    const closeHandler = this._funcs.get('close');
    if (closeHandler) {
      try {
        closeHandler(e);
      } catch (error) {
        console.error('Error in close handler:', error);
      }
    }

    // Disable automatic reconnection for now to prevent duplicate sessions
    // if (this.shouldReconnect && e.code !== 1000 && e.code !== 3333 && e.code !== 1001) {
    //   this._scheduleReconnect();
    // }
  }

  _onError(e) {
    console.error('WebSocket error:', e);
    
    const errorHandler = this._funcs.get('error');
    if (errorHandler) {
      try {
        errorHandler(e);
      } catch (error) {
        console.error('Error in error handler:', error);
      }
    }
  }

  _onMessage(pack) {
    this.lastMessageTime = Date.now();

    try {
      if (typeof pack.data !== "string") {
        const arr = new Uint8Array(pack.data);
        if (arr.length > 0) {
          const handler = this._funcsBin.get(arr[0]);
          if (handler) {
            handler(arr);
          }
        }
        return;
      }

      if (typeof pack.data === "string") {
        if (pack.data.length > 0) {
          const handler = this._funcsBin.get(pack.data[0]);
          if (handler) {
            handler(pack.data);
            return;
          }
        }
      }

      if (pack.data[0] !== "[") return;

      const parsed = JSON.parse(pack.data);
      if (!Array.isArray(parsed) || parsed.length !== 2) {
        console.warn('Invalid message format:', pack.data);
        return;
      }

      const [id, data] = parsed;
      const handler = this._funcs.get(id);

      if (handler) {
        if (Array.isArray(data)) {
          handler(...data);
        } else {
          handler(data);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      console.error('Message data:', pack.data);
    }
  }

  _scheduleReconnect() {
    if (this.isReconnecting || !this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.shouldReconnect) {
        this._setupSocket(this.url, this.protocols, this.opts);
      }
    }, delay);
  }

  _flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.ws.send(message);
    }
  }
  test() {
    this.close(3333);
  }

  on(id, callback) {
    this._funcs.set(id, callback);
  }

  off(id) {
    this._funcs.delete(id);
  }

  offBin(id) {
    this._funcsBin.delete(id);
  }

  bin(id, callback) {
    this._funcsBin.set(id, callback);
  }

  switch(url, protocols) {
    this.shouldReconnect = false;
    this.close(1000, "switching servers");
    this.shouldReconnect = true;
    this._setupSocket(url, protocols, {});
  }

  emitBinary(bin) {
    return this.send(bin);
  }

  send(data) {
    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      if (this.shouldReconnect) {
        this.messageQueue.push(data);
      }
      return false;
    }

    try {
      this.ws.send(data);
      return true;
    } catch (error) {
      console.error('Error sending data:', error);
      return false;
    }
  }

  emit(id, ...data) {
    // Keep the old packet format for compatibility
    let packet = [id, new Array(data.length)];
    for (let i = 0; i < data.length; i++)
      packet[1][i] = data[i];
    
    const serialized = JSON.stringify(packet);
    
    if (!this.isConnected) {
      if (this.shouldReconnect) {
        this.messageQueue.push(serialized);
      }
      return false;
    }

    if (this.ws.bufferedAmount > 1024 * 1024) {
      console.warn('Send buffer full, dropping message');
      return false;
    }

    return this.send(serialized);
  }

  close(code = 1000, reason = 'Normal closure') {
    this.shouldReconnect = false;
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  reconnect() {
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this._setupSocket(this.url, this.protocols, this.opts);
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      reconnectAttempts: this.reconnectAttempts,
      messageQueueSize: this.messageQueue.length,
      lastMessageTime: this.lastMessageTime
    };
  }
}

