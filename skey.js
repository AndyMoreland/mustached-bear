/*
 CS255 - Winter 2014
 Assignment 1: S/KEY Authentication
 Starter Code Version: 1.0

 SUNet ID #1:
 SUNet ID #2:

 Step 1: Find a project partner and add your SUNet IDs above.
 Step 2: Implement `initialize`, `advance`, `save`, and `load` in `pebble_chain`.
 Step 3: Answer the questions below.
 Step 4: See Piazza for submission instructions.
 */

/* 1. Briefly describe your implementation and its design choices. (e.g. What algorithm did you use? How did you structure your code? Did you do something interesting in \texttt{save}/\texttt{load}? If it's not obvious, justify the space/time used by your implementation.)
 // TODO: Answer here (a few sentences).
 */

/* 2. If you were designing an authentication mechanism for a hot new startup that wants to protect its users, how would you decide whether/where to use S/KEY?
 // TODO: Answer here (a few sentences).
 */

/* 3. (Will not affect your grade:) How long did you spend on this project?
 // TODO: Answer here (just a number).
 */

/* 4. (Optional:) Do you have any comments or suggestions for improving the assignment?
 // TODO: Answer here (optional).
 */


/********* External Imports and Convenience Functions ********/


"use strict"; // Makes it easier to catch errors.

var sjcl = require("./lib/sjcl");
var hash = sjcl.hash.sha256.hash; // Hashes a string or bitArray to a bitArray.
var is_equal = sjcl.bitArray.equal; // Compares two bitArrays.
var hex = sjcl.codec.hex.fromBits; // Converts a bitArray to a hex string.

var pow2 = Math.pow.bind(this, 2); // Calculates 2 to a given power.
var log2 = function(x) {return Math.log(x) / Math.log(2);} // Calculates log base 2.


/******** Naive Hash Chain Implementation ********/


function naive_chain() {

  var chain = {
    state: null
  };

  chain.initialize = function(num_iterations, seed) {
    chain.state = {
			position: 0,
			num_iterations: num_iterations,
      start: hash(seed)
    }

    var initial = chain.state.start;
    for (var i = 0; i < chain.state.num_iterations; i++) {
      initial = hash(initial);
    }

    return initial;
  }

  chain.advance = function() {
    if (chain.state.position + 1 > chain.state.num_iterations) {
      return null;
    }

    var value = chain.state.start;
    for (var i = 1; i < chain.state.num_iterations - chain.state.position; i++) {
      value = hash(value);
    }
    chain.state.position += 1;
    return value;
  }

  // Returns a string.
  chain.save = function() {
    return JSON.stringify(chain.state);
  }

  // Loads a string.
  chain.load = function(str_data) {
    chain.state = JSON.parse(str_data);
  }

  return chain;
}


/******** Pebble-Based Hash Chain Implementation (Jakobsson's algorithm) ********/

function log2(x) {
	return Math.log(x) / Math.log(2);
}


function pebble_chain() {

  var chain = {
    state: null
  };

  chain.initialize = function(num_iterations, seed) {
		if (num_iterations % 2 != 0) {
			console.error("Invalid num_iterations");
		}

		chain.state = {
			position: 0,
			num_iterations: num_iterations,
      start: hash(seed),
			pebbles: []
    }

		chain.state.current_hash = chain.state.start;
		chain.layout_initial_pebbles();

		var initial_hash = chain.state.current_hash;
		
		chain.advance();
		
		return initial_hash;
  }

	chain.layout_initial_pebbles = function () {
		var num_pebbles = log2(chain.state.num_iterations);
		var cur_hash = chain.state.start;

		for (var i = chain.state.num_iterations; i >= 1; i--) {
			// might be off-by-1 here
			cur_hash = hash(cur_hash);
			if (Math.floor(log2(i)) == log2(i)) {
				chain.state.pebbles.push(cur_hash);
			}
		}

		// add a dummy pebble for convenience sake!
		chain.state.pebbles[num_pebbles] = chain.state.start;

		chain.state.pebbles = chain.state.pebbles.reverse();
		chain.state.current_hash = cur_hash;
	}
	
  chain.advance = function() {
		chain.state.current_hash = chain.state.pebbles[0];
		var has_moved = false;
		
		for (var i = log2(chain.state.num_iterations) - 1; i >= 0; i--) {
			if (chain.state.current_hash == chain.state.pebbles[i]) {
				if (!has_moved) {
					chain.state.pebbles[i] = chain.state.pebbles[i+1];
				} else {
					var current_hash = chain.state.pebbles[i+1];
					for (var j = 0; j < Math.pow(i, 2); j++) { current_hash = hash(current_hash); }
					chain.state.pebbles[i] = current_hash;
				}

				has_moved = true;
			} else {
				has_moved = false;
			}
		}

		return chain.state.current_hash;
  }

  // Returns a string.
  chain.save = function() {
    // TODO
    throw "pebble_chain.save() is not implemented yet.";
  }

  // Loads a string.
  chain.load = function(str_data) {
    // TODO
    throw "pebble_chain.load() is not implemented yet.";
  }

  return chain;
}

/********* Export functions for testing. ********/


module.exports.naive_chain = naive_chain;
module.exports.pebble_chain = pebble_chain;


/********* End of Original File ********/
