/**
 * MountainCar.js
 *
 *   A simple test bed for reinforcement learning
 *   https://en.wikipedia.org/wiki/Mountain_Car
 */

function createClamp(min, max) {
    return (function(v) {
        if (v < min) { return min; } else
        if (v > max) { return max; }
        else         { return v; }
    });
}

var totalSteps = []

function MountainCar(opt) {
    this.position = -0.5;
    this.positionClamp = createClamp(-1.2, 0.6);

    this.velocity = 0.0;
    this.velocityClamp = createClamp(-0.07, 0.07);

    this.numActions = 3;

    this.acted = undefined;
    this.step = 0;

    this.width = opt.width || 640;
    this.height = opt.height || 360;

    this.region = opt.region || {x: [0, this.width], y: [0, this.height]};
    this.region.y = [this.region.y[1], this.region.y[0]];
    this.region2px = function(xy) {
        var x = xy[0], y = xy[1];
        return [
            (x - this.region.x[0]) / (this.region.x[1] - this.region.x[0]) * this.width,
            (y - this.region.y[0]) / (this.region.y[1] - this.region.y[0]) * this.height
        ];
    };
}
MountainCar.prototype = {
    createCanvas: function(parent) {
        var canvas = createCanvas(this.width, this.height);
        if (parent !== undefined) {
            canvas.parent(parent);
        }
    },
    vertex: function(x, y) {
        var translated = this.region2px([x, y])
        vertex(translated[0], translated[1]);
    },
    act: function(act_index) {
        var action;
        switch (act_index) {
        case 0:
            action = -1; break;
        case 1:
            action =  0; break;
        case 2:
            action =  1; break;
        }
        this.velocity = this.velocityClamp(this.velocity + action * 0.001 + Math.cos(3 * this.position) * -0.0025);
        this.position = this.positionClamp(this.position + this.velocity);

        this.acted = action;
    },
    getHeight: function(pos) {
        return Math.sin(3.0 * pos);
    },
    getSlope: function(pos) {
        return -Math.cos(3.0 * pos);
    },
    calcState: function() {
        return [this.velocity, this.position];
    },
    calcReward: function() {
        return (-1.0 + this.getHeight(this.position)) * 0.5;

        /*
        // Another reward function which didn't work in this example
        if (this.hasReached()) {
            return 0;
        }
        return -1;
        */
    },
    hasReached: function() {
        return (this.position >= 0.6);
    },
    draw: function() {
        clear();
        this.drawNiceHill();
        this.drawCoolGoal();

        var carCoord = this.region2px([this.position, this.getHeight(this.position)]);
        var carSlope = this.getSlope(this.position);
        this.drawCuteCar(carCoord, carSlope);
        this.drawTotalSteps();
    },
    drawNiceHill: function() {
        noStroke();
        fill(25, 150, 25);

        beginShape();

        this.vertex(this.region.x[0], this.region.y[1]);

        for (var x = this.region.x[0];
             x  <  this.region.x[1] + 0.1;
             x += Math.abs(this.region.x[1] - this.region.x[0]) / 100.) {
            this.vertex(x, this.getHeight(x));
        }
        this.vertex(this.region.x[1], this.region.y[1]);
        endShape(CLOSE);
    },
    drawCoolGoal: function() {
        strokeWeight(1);
        stroke(0, 0, 0);
        fill(255, 0, 0);

        beginShape();

        this.vertex(0.60, this.getHeight(0.60));
        this.vertex(0.60, this.getHeight(0.60) + 0.1);

        this.vertex(0.60, this.getHeight(0.60) + 0.1);
        this.vertex(0.65, this.getHeight(0.60) + 0.1);
        this.vertex(0.65, this.getHeight(0.60) + 0.18);
        this.vertex(0.60, this.getHeight(0.60) + 0.18);
        this.vertex(0.60, this.getHeight(0.60) + 0.1);

        endShape();
    },
    drawCuteCar: function(xy, slope) {
        push();
        translate(xy[0], xy[1]);
        rotate(slope);

        // body
        fill(255, 150, 25);
        beginShape();

        vertex(-8, -8);
        vertex(18, -8);
        vertex(18, -20);
        vertex(-8, -20);
        vertex(-8, -8);

        endShape(CLOSE);

        // left tire
        ellipseMode(CORNER);
        fill(128, 128, 128);
        ellipse(-12, -12, 15, 15);
        // rigth tire
        ellipse(8, -12, 15, 15);

        // action
        fill(25, 255, 255);

        beginShape();

        if (this.acted == -1) {
            vertex(-20, -3);
            vertex(-20, -20);
            vertex(-35, -10);
            vertex(-20, -3);
        } else if (this.acted == 1) {
            vertex(30, -3);
            vertex(30, -20);
            vertex(45, -10);
            vertex(30, -3);
        }
        endShape(CLOSE);

        rotate(0);
        pop();
    },
    addTotalStep: function(totalStep) {
        totalSteps.push(totalStep);
    },
    drawTotalSteps: function() {
        var maxStep = 5000;

        // text
        noStroke();
        fill(255);
        text("0", 449, 343);
        text(maxStep, 429, 266);

        // graph
        var graphWidth = 160, graphHeight = 80;
        var getY = function(value) {
            var result = graphHeight - value * graphHeight / maxStep;
            if (result < 0) {
                result = 0;
            }
            return result;
        };

        push();
        translate(460, 260);
        fill(255, 255, 255, 180);
        rect(0, 0, graphWidth, graphHeight);

        noFill();
        stroke(0, 0, 255, 255);
        beginShape();
        for (var i = 0; i < totalSteps.length; i++) {
            vertex(i * 2, getY(totalSteps[i]));
        }
        endShape();
        pop();
    },
}


/*
 * main
 */
var env;
var brain;
var nextAction;
var alreadyStarted;

var currentState;
var reward;

function prepareTileCodingBrain() {
    var num_states = 2;    // 2 states (velocity, position)
    var num_actions = env.numActions;
    var opt = {
        epsilon: 0.05,
        gamma: 0.7,
        alpha: 0.8,

        // CMAC settings
        nlevels: 48,
        quantization: 0.001,

        algorithm: Agent.Sarsa,
        // algorithm: Agent.Q_learning,
    };

    return new Agent(num_states, num_actions, opt);
}

function prepareDQNBrain() {
    var num_inputs = 2;    // 2 states (velocity, position)
    var num_actions = env.numActions;   // left, none, right
    var temporal_window = 1;
    var network_size = num_inputs*temporal_window + num_actions*temporal_window + num_inputs;

    var layer_defs = [];
    layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:network_size});
    layer_defs.push({type:'fc', num_neurons: 8, activation:'relu'});
    layer_defs.push({type:'regression', num_neurons:num_actions});

    var tdtrainer_options = {learning_rate:0.001, momentum:0.2, batch_size:64, l2_decay:0.01};

    var opt = {};
    opt.temporal_window = temporal_window;
    opt.experience_size = 0;   //1000;   //30000;
    opt.start_learn_threshold = 1000;
    opt.gamma = 0.8;
    opt.learning_steps_total = 10000;   //200000;
    opt.learning_steps_burnin = 3000;
    opt.epsilon_min = 0.2;   //0.05;
    opt.epsilon_test_time = 0.05;
    opt.layer_defs = layer_defs;
    opt.tdtrainer_options = tdtrainer_options;

    return new deepqlearn.Brain(num_inputs, num_actions, opt);
}

function reset() {
    /* prepare an environment */
    env = new MountainCar({
        width: 640,
        height: 360,
        region: {
            x: [-1.21, 0.67],
            y: [-1.10, 1.20]
        }
    });
    nextAction = undefined;
    alreadyStarted = false;
}

function tick() {
    if (!alreadyStarted) {
        // return agent's state
        currentState = env.calcState();
        alreadyStarted = true;
        return;
    }

    nextAction = brain.forward(currentState);
    env.act(nextAction);
    env.step += 1;

    var reward = env.calcReward();

    // return agent's state
    currentState = env.calcState();

    // check state
    if (env.hasReached()) {
        console.log("Total steps: ", env.step, "\n");

        if (totalSteps.length > 80) {
            totalSteps.shift();
        }
        totalSteps.push(env.step);
        reset();
    }

    // reset
    if (env.step > 5000) {
        console.log("Total steps > 5000: reset.\n");
        reset();
    }

    brain.backward(reward);
}


var frameSlider, epsilonSlider, alphaSlider;

function setup() {
    reset();
    env.createCanvas("p5");

    //brain = prepareDQNBrain();   // [FIXME] I couldn't find appropriate DQN settings...
    brain = prepareTileCodingBrain();

    frameSlider = createSlider(1, 500, 10);
    frameSlider.position(135, 20);

    epsilonSlider = createSlider(0, 100, 5);   // 5 / 100. = 0.05
    epsilonSlider.position(135, 45);

    alphaSlider = createSlider(0, 100, 70);    // 70 / 100. = 0.70
    alphaSlider.position(135, 70);
}

function draw() {
    // agent's epsilon value
    brain.epsilon = epsilonSlider.value() / 100;
    brain.alpha = alphaSlider.value() / 100;

    // go!
    for (var i = 0; i <= frameSlider.value(); i++) {
        tick();
    }

    // draw
    env.draw();

    // steps
    textSize(18);
    noStroke();
    fill(255);
    text("step: " + env.step, 20, 340);

    // sliders
    textSize(15);
    fill(0);
    text("Draw steps: " + frameSlider.value(), 15, 28);
    text("epsilon: " + epsilonSlider.value() / 100, 15, 52);
    text("alpha: " + alphaSlider.value() / 100, 15, 75);
}
