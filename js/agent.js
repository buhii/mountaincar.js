/**
 * agent.js
 *
 * Copyright (C) 2015, Takahiro Kamatani
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */

function randi(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function randf(min, max) {
    return Math.random() * (max - min) + min;
}

function sgn(x) {
    return (x < 0) ? -1 : 1;
}

function hypot(x, y) {
    return Math.sqrt(x * x + y * y);
}

var Agent = function(num_states, num_actions, opt) {
    var opt = opt || {};

    this.algorithm = opt.algorithm || Agent.Sarsa;

    this.num_states = num_states;
    this.num_actions = num_actions;

    this.state0 = undefined;
    this.action0 = undefined;
    this.state1 = undefined;     // next_state
    this.action1 = undefined;    // next_action

    this.gamma = opt.gamma || 0.8;
    this.alpha = opt.alpha || 0.5;
    this.epsilon = opt.epsilon || 0.05;

    this.value_net = new CMAC({
        nlevels: opt.nlevels || 16,
        quantization: opt.quantization || 0.1,
        beta: opt.beta || 0.1,
    });
}

Agent.Sarsa = "Sarsa";
Agent.Q_learning = "Q_learning";

Agent.prototype = {
    max_action: function(state) {
        var max_act = undefined;
        var max_q = undefined;
        var predicted;

        for (var a = 0; a < this.num_actions; a++) {
            predicted = this.value_net.predict(state.concat(a));

            if (max_q == undefined) {
                max_q = predicted;
                max_act = a;
            }

            if (max_q < predicted) {
                max_q = predicted;
                max_act = a;
            }
        }
        return max_act;
    },
    update_q_learning: function(state, action, reward, next_state) {
        // Q(s, a) <- Q(s, a) + alpha[r + gamma(Q(s', a') where a is max action) - Q(s, a)]
        var q_s_a = this.value_net.predict(state.concat(action));
        var max_action = this.max_action(next_state);
        var q_sd_ad = this.value_net.predict(next_state.concat(max_action));
        this.value_net.train(
            state.concat(action),   // vector
            q_s_a + this.alpha * (reward + this.gamma * q_sd_ad - q_s_a)   // response
        );
    },
    update_sarsa: function(state, action, reward, next_state, next_action) {
        // Q(s, a) <- Q(s, a) + alpha[r + gamma * Q(s', a') - Q(s, a)]
        var q_s_a = this.value_net.predict(state.concat(action));
        var q_sd_ad = this.value_net.predict(next_state.concat(next_action));
        this.value_net.train(
            state.concat(action),   // vector
            q_s_a + this.alpha * (reward + this.gamma * q_sd_ad - q_s_a)   // response
        );
    },
    forward: function(state) {
        this.state0 = this.state1;
        this.state1 = state;

        // The epsilon-greedy policy
        var max_act;
        if (Math.random() < this.epsilon) {
            max_act = randi(0, this.num_actions);
        } else {
            max_act = this.max_action(state);
        }

        this.action0 = this.action1;
        this.action1 = max_act;
        return max_act;
    },
    backward: function(reward) {
        if (this.algorithm == Agent.Sarsa) {
            this.backward_sarsa(reward);
        } else {
            this.backward_q_learning(reward);
        }
    },
    backward_sarsa: function(reward) {
        if (this.state0  !== undefined &&
            this.state1  !== undefined &&
            this.action0 !== undefined &&
            this.action1 !== undefined) {

            this.update_sarsa(
                this.state0, this.action0, reward, this.state1, this.action1
            );
        }
    },
    backward_q_learning: function(reward) {
        if (this.state0  !== undefined &&
            this.state1  !== undefined &&
            this.action0 !== undefined) {

            this.update_q_learning(
                this.state0, this.action0, reward, this.state1
            )
        }
    },
}
