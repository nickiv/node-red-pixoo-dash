module.exports = function(RED) {
    function pixooBrightNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.config = RED.nodes.getNode(n.config);
        this.brightness = Number(n.brightness);
        node.on("input", function(msg, send, done){
          if (!this.config){
            done("No config node");
            return;
          }
          let brightness = node.brightness;
          const payloadBrightness = parseInt(msg.payload);
          if (!isNaN(payloadBrightness)){
            brightness = payloadBrightness;
          }
          this.config.getPixoo().setBrightness(brightness).then((resp)=>{
            msg.payload = resp;
            send(msg);
            done();
          }).catch((err)=>{
            done(err);
          });
        });
    }

    RED.nodes.registerType("pixoo-dash-bright", pixooBrightNode);
}