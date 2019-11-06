import EventEmitter from 'events';

export default class RWS extends EventEmitter {
  constructor(url, options = {}, protocols = []) {
    super();
    const settings = {
      debug: false,
      automaticOpen: true,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      timeoutInterval: 2000,
      maxReconnectAttempts: null,
      binaryType: 'blob',
    };
    this.url = url;
    this.protocols = protocols;
    const settingsKeys = Object.keys(settings);
    for (const setting of settingsKeys) {
      this[setting] = setting in options ? options[setting] : settings[setting];
    }

    this.ws = null;
    this.forcedClose = false;
    this.timedOut = false;
    this.reconnectAttempts = 0;
    this.readyState = WebSocket.CONNECTING;
    this.protocol = null;

    // Initialize callbacks
    const handlers = [ 'onconnecting', 'onopen', 'onclose', 'onmessage', 'onerror' ];
    for (const handler of handlers) {
      this[handler] = (event) => event;
    }

    this.on('connecting', (event) => {
      this.onconnecting(event);
    });
    this.on('open', (event) => {
      this.onopen(event);
    });
    this.on('close', (event) => {
      this.onclose(event);
    });
    this.on('message', (event) => {
      this.onmessage(event);
    });
    this.on('error', (event) => {
      this.onerror(event);
    });

    if (this.automaticOpen === true) {
      this.open(false);
    }

    this.CONNECTING = WebSocket.CONNECTING;
    this.OPEN = WebSocket.OPEN;
    this.CLOSING = WebSocket.CLOSING;
    this.CLOSED = WebSocket.CLOSED;

    this.DEFAULT_CODE = 1000;
  }

  dbg(...args) {
    if (this.debug) {
      console.debug(...args); //eslint-disable-line
    }
  }

  open(reconnectAttempt = false) {
    let isReconnectAttempt = reconnectAttempt;
    this.ws = new WebSocket(this.url, this.protocols);
    this.ws.binaryType = this.binaryType;

    // check for max reconnect attempts
    if (reconnectAttempt) {
      if (this.maxReconnectAttempts && this.reconnectAttempts > this.maxReconnectAttempts) {
        return;
      }
    } else {
      this.emit('connecting', { isReconnect: isReconnectAttempt });
      this.reconnectAttempts = 0;
    }

    this.dbg('RWS', 'attempt-connect', this.url);

    this.timeout = setTimeout(() => {
      this.dbg('RWS', 'connection-timeout', this.url);
      this.timedOut = true;
      this.ws.close();
      this.timedOut = false;
    }, this.timeoutInterval);

    this.ws.onopen = (event) => {
      clearTimeout(this.timeout);
      this.dbg('RWS', 'onopen', this.url);
      this.protocol = this.ws.protocol;
      this.readyState = WebSocket.OPEN;
      this.reconnectAttempts = 0;
      event.isReconnect = isReconnectAttempt;
      this.emit('open', event);
      isReconnectAttempt = false;
    };

    this.ws.onclose = (event) => {
      clearTimeout(this.timeout);
      this.ws = null;
      if (this.forcedClose) {
        this.readyState = WebSocket.CLOSED;
        this.emit('close', event);
      } else {
        if (!this.reconnectAttempts && !this.timedOut) {
          this.dbg('RWS', 'onclose', this.url);
          this.emit('close', event);
        }
        event.isReconnect = true;
        this.emit('connecting', event);
        const timeout = this.reconnectInterval * Math.pow(
          this.reconnectDecay, this.reconnectAttempts);
        setTimeout(() => {
          this.reconnectAttempts++;
          this.open(true);
        }, timeout > this.maxReconnectInterval ? this.maxReconnectInterval : timeout);
      }
    };

    this.ws.onmessage = (event) => {
      this.dbg('RWS', 'onmessage', this.url, event.data);
      this.emit('message', event);
    };

    this.ws.onerror = (event) => {
      this.dbg('RWS', 'onerror', this.url, event);
      this.emit('error', event);
    };
  }

  send(message) {
    if (this.ws) {
      this.dbg('RWS', 'send', this.url, message);
      return this.ws.send(message);
    }
    throw new Error('INVALID_STATE_ERR');
  }

  close(code = this.DEFAULT_CODE, reason) {
    this.forcedClose = true;
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  refresh() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
