module.exports = function(RED) {
    function pixooTextNode(n) {
        RED.nodes.createNode(this, n);
        var node = this;
        this.config = RED.nodes.getNode(n.config);
        this.col = Number(n.col);
        this.row = Number(n.row);
        this.color = n.color;
        node.on("input", function(msg, send, done){
          if (!this.config){
            done("No config node");
            return;
          }
          let col = node.col;
          if (msg.hasOwnProperty("col")){
            col = Number(msg.col);
          }
          let row = node.row;
          if (msg.hasOwnProperty("row")){
            row = Number(msg.row);
          }
          let color = node.color;
          if (msg.hasOwnProperty("color")){
            switch (msg.color.toString().toLowerCase()){
              case "black":
                color = "#000000";
                break;
              case "red":
                color = "#FF0000";
                break;
              case "yellow":
                color = "#FFFF00";
                break;
              case "green":
                color = "#00FF00";
                break;
              case "cyan":
                color = "#00FFFF";
                break;
              case "orange":
                color = "#FFA500";
                break;
              case "white":
                color = "#FFFFFF";
                break;
              default:
                color = msg.color;
            }
          }
          this.config.printText(msg.payload, col, row, color).then((resp)=>{
            msg.payload = resp;
            send(msg);
            done();
          }).catch((err)=>{
            done(err);
          });
        });
    }

    RED.nodes.registerType("pixoo-dash-send", pixooTextNode);
}