const bodyParser = require('body-parser');
const path = require('path');
const { createServer } = require('http');
const uws = require('uWebSockets.js');
const fs = require('fs');

require('isomorphic-fetch');

uws.App().ws('/*', {

  /* There are many common helper features */
  idleTimeout: 32,
  maxBackpressure: 1024,
  maxPayloadLength: 512,

  /* For brevity we skip the other events (upgrade, open, ping, pong, close) */
  message: (ws, message, isBinary) => {
    /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */

    /* Here we echo the message back, using compression if available */
    //    const ok = ws.send(message, isBinary, true);
    console.log(message);
  },

}).get('/*', (res, req) => {
  // send file
  res.writeHeader('Content-Type', 'text/html');
  try {
    const url = req.getUrl();
    const p = `../../dist${url === '/' ? '/index.html' : url}`;
    res.end(fs.readFileSync(path.resolve(__dirname, p)));
  } catch (e) {
    res.writeStatus();
    res.end();
  }
}).listen(3000, (e) => {
  if (e) {
    console.log(' server started!', e);
  }
});
