const http = require('http');
const Palette = require('./_colors');
const retrieveGlyph = require('./_font').retrieveGlyph;

const REQTIMEOUT = 5000;

function clamp(value, minimum = 0, maximum = 255) {
    if (value > maximum) {
        return maximum;
    }
    if (value < minimum) {
        return minimum;
    }

    return value;
}

function clampColor(rgb) {
    let c = [clamp(rgb[0]), clamp(rgb[1]), clamp(rgb[2])];
    return c;
}

function lerp(start, end, interpolant) {
    return start + interpolant * (end - start);
}

function lerpLocation(xy1, xy2, interpolant) {
    return [lerp(xy1[0], xy2[0], interpolant), lerp(xy1[1], xy2[1], interpolant)];
}

function minimumAmountOfSteps(xy1, xy2) {
    return Math.max(Math.abs(xy1[0] - xy2[0]), Math.abs(xy1[1] - xy2[1]));
}

function rgbToHexColor(rgb) {
    return `#${rgb[0].toString(16).padStart(2, '0')}${rgb[1].toString(16).padStart(2, '0')}${rgb[2].toString(16).padStart(2, '0')}`;
}

function roundLocation(xy) {
    return Math.round(xy[0]), Math.round(xy[1]);
}



class TextScrollDirection {
    static get LEFT() { return 0; }
    static get RIGHT() { return 1; }
}

class Pixoo {
    constructor(address, size = 64, debug = false, refreshConnectionAutomatically = true) {
        if (![16, 32, 64].includes(size)) {
            throw new Error('Invalid screen size in pixels given. Valid options are 16, 32, and 64');
        }

        this.refreshConnectionAutomatically = refreshConnectionAutomatically;
        this.address = address;
        this.debug = debug;

        this.size = size;

        // Total number of pixels
        this.pixelCount = this.size * this.size;

        // Generate URL
        this.url = `http://${address}/post`;


        this.resetGifId();
        // Prefill the buffer
        this.fill();


        // Retrieve the counter
        this.loadCounter();
        // Resetting if needed
        if (this.refreshConnectionAutomatically && this.counter > this.refreshCounterLimit) {
            this.resetCounter();
        }
    }

    clear(rgb = Palette.COLOR_BLACK) {
        this.fill(rgb);
    }

    clearRgb(r, g, b) {
        this.fillRgb(r, g, b);
    }

    drawCharacter(character, xy = [0, 0], rgb = Palette.WHITE) {
        const matrix = retrieveGlyph(character);
        if (matrix) {
            for (let index = 0; index < matrix.length; index += 1) {
                if (matrix[index] === 1) {
                    const localX = index % 3;
                    const localY = Math.floor(index / 3);
                    this.drawPixel([xy[0] + localX, xy[1] + localY], rgb);
                }
            }
        }
    }

    drawCharacterAtLocationRgb(character, x = 0, y = 0, r = 255, g = 255, b = 255) {
        this.drawCharacter(character, [x, y], [r, g, b]);
    }

    drawFilledRectangle(start, stop, rgb = Palette.WHITE) {
        for (let x = start[0]; x < stop[0]; x += 1) {
            for (let y = start[1]; y < stop[1]; y += 1) {
                this.drawPixel([x, y], rgb);
            }
        }
    }

    drawFilledRectangleFromTopLeftToBottomRightRgb(x1, y1, x2, y2, r, g, b) {
        this.drawFilledRectangle([x1, y1], [x2, y2], [r, g, b]);
    }

    drawImageAtLocation(path, x, y) {
        this.drawImage(path, [x, y]);
    }

    drawLine(start, stop, rgb = Palette.WHITE) {
        const length = minimumAmountOfSteps(start, stop);
        for (let i = 0; i <= length; i += 1) {
            const interpolant = i / length;
            this.drawPixel(roundLocation(lerpLocation(start, stop, interpolant)), rgb);
        }
    }

    drawPixel(xy, rgb = Palette.WHITE) {
        if (xy[0] >= 0 && xy[0] < this.size && xy[1] >= 0 && xy[1] < this.size) {
            this.buffer[xy[0] + (xy[1] * this.size)] = clampColor(rgb);
        }
    }

    drawPixelAtIndex(index, rgb = Palette.WHITE) {
        this.drawPixel(this.indexToXY(index), rgb);
    }

    drawPixelAtIndexRgb(index, r, g, b) {
        this.drawPixelAtIndex(index, [r, g, b]);
    }

    drawPixelAtLocationRgb(x, y, r, g, b) {
        this.drawPixel([x, y], [r, g, b]);
    }

    drawText(text, xy = [0, 0], rgb = Palette.WHITE) {
        for (let i = 0; i < text.length; i += 1) {
            this.drawCharacter(text[i], [xy[0] + (i * 4), xy[1]], rgb);
        }
    }

    drawTextAtLocationRgb(text, x = 0, y = 0, r = 255, g = 255, b = 255) {
        this.drawText(text, [x, y], [r, g, b]);
    }

    fill(rgb = Palette.COLOR_BLACK) {
        this.buffer = new Array(this.pixelCount).fill(rgb);
    }

    fillRgb(r, g, b) {
        this.fill([r, g, b]);
    }

    indexToXY(index) {
        return [index % this.size, Math.floor(index / this.size)];
    }

    loadCounter() {
        this.counter = 10;
    }

    resetCounter() {
        this.counter = 0;
        this.buffersSend = 0;
        const options = {
            hostname: this.address,
            port: 80,
            path: '/resetCounter',
            method: 'GET',
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (this.debug) {
                    console.log('resetCounter response:', responseData);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with resetCounter request: ${e.message}`);
        });

        req.end();
    }

    sendText(channel, text, direction = TextScrollDirection.LEFT, speed = 1, rgb = Palette.WHITE, align = 'left') {
        const data = JSON.stringify({
            text,
            channel: channel.value,
            direction: direction.value,
            speed,
            color: rgbToHexColor(rgb),
            align,
        });

        const options = {
            hostname: this.address,
            port: 80,
            path: '/post',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
            timeout: REQTIMEOUT,
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (this.debug) {
                    console.log('sendText response:', responseData);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with sendText request: ${e.message}`);
        });

        req.write(data);
        req.end();
    }

    resetGifId() {
        const data = JSON.stringify({ "Command": "Draw/ResetHttpGifId" });

        const options = {
            hostname: this.address,
            port: 80,
            path: '/post',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
            },
            timeout: REQTIMEOUT,
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                if (this.debug) {
                    console.log('resetGifId response:', responseData);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with resetGifId request: ${e.message}`);
        });

        req.write(data);
        req.end();
    }

    async push() {
        return new Promise(async (resolve, reject) => {
            // Add to the internal counter
            this.counter = this.counter + 1;

            // Check if we've passed the limit and reset the counter for the animation remotely
            if (this.refresh_connection_automatically && this.counter >= this.__refresh_counter_limit) {
                this.__resetCounter();
                this.counter = 1;
            }

            // Encode the buffer to base64 encoding
            let payload = {
                Command: 'Draw/SendHttpGif',
                PicNum: 1,
                PicWidth: this.size,
                PicOffset: 0,
                PicID: this.counter,
                PicSpeed: 1000,
                PicData: Buffer.from(this.buffer.flat()).toString('base64'),
            }

            const data = JSON.stringify(payload);

            const options = {
                hostname: this.address,
                port: 80,
                path: '/post',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': data.length,
                },
                timeout: REQTIMEOUT,
            };

            const req = http.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    const responseJson = JSON.parse(responseData);
                    if (responseJson.error_code !== 0) {
                        reject(new Error(`Error code ${responseJson.error_code}`));
                    } else {
                        this.buffers_send = this.buffers_send + 1;
                        if (this.debug) {
                            console.log('Push response:', responseJson);
                        }
                        resolve(responseJson);
                    }
                });
            });

            req.on('error', (e) => {
                console.error(`Problem with Push request: ${e.message}`);
                reject(e);
            });

            req.write(data);
            req.end();
        });
    }
}

module.exports = Pixoo;