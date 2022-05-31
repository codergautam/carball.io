const uws = require('uWebSockets.js');
require('isomorphic-fetch');

const get = require('./get');
const ws = require('./ws');

uws.App().ws('/*', ws).get('/*', get).listen(3000, (e) => {
  if (e) {
    console.log(' server started!', e);
  }
});
