/*

cmac.js

 - Tile coding function approximation
 - Ported from Jeremy Stober's CMAC python implementation (https://github.com/stober/cmac)


Copyright (c) 2008-2012, Jeremy Stober
Copyright (c) 2015, Takahiro Kamatani
All rights reserved.

Redistribution and use in source and binary forms, with or without modification,
are permitted provided that the following conditions are met:

	* Redistributions of source code must retain the above copyright notice,
	this list of conditions and the following disclaimer.

	* Redistributions in binary form must reproduce the above copyright notice, this
	list of conditions and the following disclaimer in the documentation
	and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/

function mod(a, b) {
    // in order not to return negative modulo
    var result = a % b;
    if (result < 0) {
        result += b;
    }
    return result;
}


var CMAC = function(opt) {
    opt = opt || {};
    this.nlevels = opt.nlevels || 32;
    this.quantization = opt.quantization || 0.01;
    this.weights = {};
    this.beta = opt.beta || 0.1;
}

CMAC.prototype = {
    getTiles: function(vector) {
        var opt = this;

        var quantized = vector.map(function(el) {
            return Math.floor(el / opt.quantization);
        });

        var getCoord = function(i) {
            return quantized.map(function(el) {
                return el - mod(el - i, opt.nlevels);
            });
        }

        var coords = [];
        for (var i = 0; i < opt.nlevels; i += 1) {
            var coord = getCoord(i);
            coord.push(i);

            coords.push(coord);
        }
        return coords;
    },
    predict: function(vector) {
        var weights = this.weights;
        var coords = this.getTiles(vector);

        var prediction = 0.0;
        coords.forEach(function(coord) {
            if (!weights[coord]) {
                weights[coord] = 0.0;
            }
            prediction += weights[coord];
        });
        return prediction / coords.length;
    },
    train: function(vector, response) {
        var weights = this.weights;
        var coords = this.getTiles(vector);
        var predicted = this.predict(vector);
        var error = this.beta * (response - predicted);

        coords.forEach(function(coord){
            weights[coord] += error;
        });

        return predicted;
    }
}


function testSin() {
    var cmac = new CMAC({
        nlevels: 32,
        quantization: 0.01,
        beta: 0.1,
    });
    var size = 1000;

    var point, response, predicted;

    for (var i = 0; i < size; i++) {
        point = Math.random() * 2 * Math.PI;
        response = Math.sin(point);

        predicted = cmac.train([point], response);

        console.log(i, point, response - predicted);
    }
}


function testWave() {
    var cmac = new CMAC({
        nlevels: 32,
        quantization: 0.1,
        beta: 0.1,
    });
    var size = 10000;

    var point, response, predicted;

    for (var i = 0; i < size; i++) {
        point = [Math.random() * 2 * Math.PI, Math.random() * 2 * Math.PI];
        response = Math.sin(point[0]) + Math.cos(point[1]);

        predicted = cmac.train(point, response);

        console.log(i, point, response - predicted);
    }
}
