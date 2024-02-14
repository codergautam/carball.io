export default class SocketWrapper {
  constructor(url, protocols, opts) {
    this._funcs = {
      open: () => { },
      close: () => { },
      error: () => { }
    };
    this._funcsBin = {};
    this._setupSocket(url, protocols, opts ?? {});
  }
  _setupSocket(url, protocols, opts) {
    if (url == null) {
      let proto = "ws://";
      if (location.protocol.match(/https/)) proto = "wss://";
      url = proto + location.host + location.pathname + location.search;
      }

    if (protocols == null) protocols = [];

    this.ws = new WebSocket(url /*+ "?token=" + token*/, protocols);
    this.ws.binaryType = "arraybuffer";

    this.ws.addEventListener("open", (e) => { (opts.open ?? (() => { }))(); this._funcs?.open(e, opts.join); });
    this.ws.addEventListener("close", (e) => { this._funcs?.close(e); });
    this.ws.addEventListener("error", (e) => { alert("Connection errored"); console.log(e); this._funcs?.error(e); });
    this.ws.addEventListener("message", (pack) => {


      try {
        //console.log(pack.data);
        if (typeof pack.data != "string") {
          let arr = new Uint8Array(pack.data);
          //console.log(arr[0] + 'hi');
          if (arr[0] in this._funcsBin)
            this._funcsBin[arr[0]](arr);
          return;
        }
        if (typeof pack.data == "string") {
          if (pack.data[0] in this._funcsBin) {
            this._funcsBin[pack.data[0]](pack.data);
            return;
          }
        }
        if (pack.data[0] != "[") return;
        pack = JSON.parse(pack.data);
        let id = pack[0];
        let data = pack[1];
        if (!(id in this._funcs)) return;

        this._funcs[id](...data);

      } catch (e) {
        console.log(e);
        console.log(pack.data);
      }


    });
    // }
    // });
  }
  test() {
    this.ws.close(3333);
  }
  on(id, callback) {
    this._funcs[id] = callback;
  }
  off(id) {
    delete this._funcs[id];
  }
  offBin(id) {
    delete this._funcsBin[id];
  }
  bin(id, callback) {
    this._funcsBin[id] = callback;
  }
  switch(url, protocols) {
    this.ws.close(1000, "switching servers");
    this._setupSocket(url, protocols, {});
  }
  emitBinary(bin) {
    this.send(bin);
  }
  send(dat) {
    if (this.ws.readyState == 1)
      this.ws.send(dat);
  }
  emit(id, ...data) {
    if (this.ws.readyState !== 1) return;
    let packet = [id, new Array(data.length)];
    let l = data.length;
    for (let i = 0; i < l; i++)
      packet[1][i] = data[i];
    if (this.ws.bufferedAmount < 1001)
      this.send(JSON.stringify(packet));
  }
}

