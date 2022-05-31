const path = require('path');
const uws = require('uWebSockets.js');
const fs = require('fs');
require('isomorphic-fetch');

uws.App().ws('/*', {
  idleTimeout: 32,
  maxBackpressure: 1024,
  maxPayloadLength: 512,
  /* other events (upgrade, open, ping, pong, close) */
  open: (ws) => {
    console.log(ws);
  },
  message: (ws, message) => {
  },
}).get('/*', (res, req) => {
  // send file
  try {
    const url = req.getUrl();
    const p = `../../dist${url === '/' ? '/index.html' : url}`;
    res.end(fs.readFileSync(path.resolve(__dirname, p)));
  } catch (e) {
    try {
      const url = req.getUrl();
      const p = `../../public${url}`;
      res.end(fs.readFileSync(path.resolve(__dirname, p)));
    } catch {
      res.writeStatus('404');
      res.writeHeader('Content-Type', 'text/html');
      res.end(JSON.stringify({
        status: 404,
        message: 'Error',
      }));
    }
  }
}).listen(3000, (e) => {
  if (e) {
    console.log(' server started!', e);
  }
});
