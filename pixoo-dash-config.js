const Pixoo = require("./src/pixoo");
const Palette = require('./src/_colors');

module.exports = function (RED) {
  function pixooConfig(config) {
    RED.nodes.createNode(this, config);
    this.ip = config.ip;
    this.debug = !!config.debug;

    const pixoo = new Pixoo(this.ip, 64, this.debug);

    this.drawBg = function(){
      pixoo.drawFilledRectangle([0,0], [63, 63], Palette.COLOR_WHITE);
      pixoo.drawFilledRectangle([1,1], [31,31], Palette.COLOR_BLACK);
      pixoo.drawFilledRectangle([32,1], [62,31], Palette.COLOR_BLACK);
      pixoo.drawFilledRectangle([1,32], [31,62], Palette.COLOR_BLACK);
      pixoo.drawFilledRectangle([32,32], [62,62], Palette.COLOR_BLACK);
    }

    this.drawBg();
    pixoo.push().catch((err)=>{
      console.error('[Pixoo]', err.message);
    });

    this.log = function(){
      if (this.debug){
        console.debug.apply(console, ['[Pixoo]', ...arguments]);
      }
    }

    this.getPixoo = function(){
      return pixoo;
    }

    var lines = [];

    this.drawTextLine = function(line){
      pixoo.drawText(line.text, [line.col * 31 + 2, line.row*6 + (line.row>4?3:2)], line.color);
    }

    function parseColorString(colorString){
      if (colorString.startsWith('#')){
        return colorString.match(/\w\w/g).map(x => parseInt(x, 16));
      }
      return [255,255,255];
    }

    this.printText = async function(text, col, row, color){
      this.drawBg();

      const line = {
        row: row,
        col: col,
        text: text.toString().substring(0, 7),
        color: parseColorString(color.toString())
      }

      this.log('printText', line);

      let newLines = [];

      if (line.text != ""){
        newLines.push(line);
      }

      for (let i=0; i<lines.length; i++){
        if (lines[i].row == row){
          if (lines[i].col == col){
            continue;
          }
        }
        newLines.push(lines[i]);
      }
      lines = newLines;
      lines.forEach(this.drawTextLine);
      return pixoo.push();
    }

    this.on("close", function () {

    });
  }

  RED.nodes.registerType("pixoo-dash-config", pixooConfig);
}