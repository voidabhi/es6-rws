## es6-rws
ES6 Implementation of ReconnectingWebsocket with EventEmitter interface

### Example

```js
import RWS from 'es6-rws';

let rws = new RWS('ws://localhost:8080', 'json', {debug: true})
```

### Building

```sh
$ npm run build
$ npm run build:browserify
```
