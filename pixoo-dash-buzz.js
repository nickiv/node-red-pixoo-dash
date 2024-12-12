module.exports = function (RED) {
  function pixooBuzzNode(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    this.config = RED.nodes.getNode(n.config);
    this.atime = Number(n.atime);
    this.itime = Number(n.itime);
    this.ttime = Number(n.ttime);
    node.on("input", function (msg, send, done) {
      if (this.config) {
        this.config.getPixoo().soundBuzzer(this.atime, this.itime, this.ttime).catch((err) => {
          console.error(`[Pixoo] soundBuzzer error ${err.messsage}`);
        });
      }
      setTimeout(() => {
        send(msg);
        done();
      });
    });
  }

  RED.nodes.registerType("pixoo-dash-buzz", pixooBuzzNode);
}