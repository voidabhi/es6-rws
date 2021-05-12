'use strict';Object.defineProperty(exports, "__esModule", { value: true });var _keys = require('babel-runtime/core-js/object/keys');var _keys2 = _interopRequireDefault(_keys);var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);var _createClass2 = require('babel-runtime/helpers/createClass');var _createClass3 = _interopRequireDefault(_createClass2);var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);var _inherits2 = require('babel-runtime/helpers/inherits');var _inherits3 = _interopRequireDefault(_inherits2);var _events = require('events');var _events2 = _interopRequireDefault(_events);function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}var

RWS = function (_EventEmitter) {(0, _inherits3.default)(RWS, _EventEmitter);
  function RWS(url) {var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};var protocols = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];(0, _classCallCheck3.default)(this, RWS);var _this = (0, _possibleConstructorReturn3.default)(this, (RWS.__proto__ || (0, _getPrototypeOf2.default)(RWS)).call(this));


    var settings = {
      debug: false,
      automaticOpen: true,
      reconnectInterval: 1000,
      maxReconnectInterval: 30000,
      reconnectDecay: 1.5,
      timeoutInterval: 2000,
      maxReconnectAttempts: null,
      binaryType: 'blob' };

    _this.url = url;
    _this.protocols = protocols;

    (0, _keys2.default)(settings).forEach(function (setting) {
      _this[setting] = setting in options ? options[setting] : settings[setting];
    });

    _this.ws = null;
    _this.forcedClose = false;
    _this.timedOut = false;
    _this.reconnectAttempts = 0;
    _this.readyState = WebSocket.CONNECTING;
    _this.protocol = null;

    // Initialize callbacks
    var handlers = ['onconnecting', 'onopen', 'onclose', 'onmessage', 'onerror'];
    handlers.forEach(function (handler) {
      _this[handler] = function (event) {return event;};
    });

    _this.on('connecting', function (event) {
      _this.onconnecting(event);
    });
    _this.on('open', function (event) {
      _this.onopen(event);
    });
    _this.on('close', function (event) {
      _this.onclose(event);
    });
    _this.on('message', function (event) {
      _this.onmessage(event);
    });
    _this.on('error', function (event) {
      _this.onerror(event);
    });

    if (_this.automaticOpen === true) {
      _this.open(false);
    }

    _this.CONNECTING = WebSocket.CONNECTING;
    _this.OPEN = WebSocket.OPEN;
    _this.CLOSING = WebSocket.CLOSING;
    _this.CLOSED = WebSocket.CLOSED;

    _this.DEFAULT_CODE = 1000;return _this;
  }(0, _createClass3.default)(RWS, [{ key: 'dbg', value: function dbg()

    {
      if (this.debug) {var _console;
        (_console = console).debug.apply(_console, arguments); //eslint-disable-line
      }
    } }, { key: 'open', value: function open()

    {var _this2 = this;var reconnectAttempt = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var isReconnectAttempt = reconnectAttempt;
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

      this.timeout = setTimeout(function () {
        _this2.dbg('RWS', 'connection-timeout', _this2.url);
        _this2.timedOut = true;
        _this2.ws.close();
        _this2.timedOut = false;
      }, this.timeoutInterval);

      this.ws.onopen = function (event) {
        clearTimeout(_this2.timeout);
        _this2.dbg('RWS', 'onopen', _this2.url);
        _this2.protocol = _this2.ws.protocol;
        _this2.readyState = WebSocket.OPEN;
        _this2.reconnectAttempts = 0;
        event.isReconnect = isReconnectAttempt;
        _this2.emit('open', event);
        isReconnectAttempt = false;
      };

      this.ws.onclose = function (event) {
        clearTimeout(_this2.timeout);
        _this2.ws = null;
        if (_this2.forcedClose) {
          _this2.readyState = WebSocket.CLOSED;
          _this2.emit('close');
        } else {
          if (!_this2.reconnectAttempts && !_this2.timeout) {
            _this2.dbg('RWS', 'onclose', _this2.url);
            _this2.emit('close');
          }
          event.isReconnect = true;
          _this2.emit('connecting', event);
          var timeout = _this2.reconnectInterval * Math.pow(
          _this2.reconnectDecay, _this2.reconnectAttempts);
          setTimeout(function () {
            _this2.reconnectAttempts++;
            _this2.open(true);
          }, timeout > _this2.maxReconnectInterval ? _this2.maxReconnectInterval : timeout);
        }
      };

      this.ws.onmessage = function (event) {
        _this2.dbg('RWS', 'onmessage', _this2.url, event.data);
        _this2.emit('message', event);
      };

      this.ws.onerror = function (event) {
        _this2.dbg('RWS', 'onerror', _this2.url, event);
        _this2.emit('error', event);
      };
    } }, { key: 'send', value: function send(

    message) {
      if (this.ws) {
        this.dbg('RWS', 'send', this.url, message);
        return this.ws.send(message);
      }
      throw new Error('INVALID_STATE_ERR');
    } }, { key: 'close', value: function close()

    {var code = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.DEFAULT_CODE;var reason = arguments[1];
      this.forcedClose = true;
      if (this.ws) {
        this.ws.close(code, reason);
      }
    } }, { key: 'refresh', value: function refresh()

    {
      if (this.ws) {
        this.ws.close();
      }
    } }]);return RWS;}(_events2.default);exports.default = RWS;

