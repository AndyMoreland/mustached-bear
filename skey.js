/*
 CS255 - Winter 2014
 Assignment 1: S/KEY Authentication
 Starter Code Version: 1.0

 SUNet ID #1: andymo
 SUNet ID #2: atticusc

 Step 1: Find a project partner and add your SUNet IDs above.
 Step 2: Implement `initialize`, `advance`, `save`, and `load` in `pebble_chain`.
 Step 3: Answer the questions below.
 Step 4: See Piazza for submission instructions.
 */

/* 1. Briefly describe your implementation and its design choices. (e.g. What algorithm did you use? How did you structure your code? Did you do something interesting in \texttt{save}/\texttt{load}? If it's not obvious, justify the space/time used by your implementation.)
 * 
 */

/* 2. If you were designing an authentication mechanism for a hot new startup that wants to protect its users, how would you decide whether/where to use S/KEY?
 *
 * The first thing we would keep in mind is what level of security is really necessary. If this is just another mobile-photo-sharing-site then odds are that S/KEY is just unnecessary overhead on the login process.
 * For instance, if the user were to lose their token (phone, physical device) that displays the code, then they would be hard-locked out of the service until their identity could be verified again.
 * This is pretty horrific for trivial applications.
 *
 * If we decide that enhanced security is necessary (i.e. if we're doing some sort of email or financial application), then OTP-style authentication is a strong contender.
 * We would probably use OTP as a secondary layer. Passwords are already commonplace and add a layer of security that exists only in the user's mind:
 * even if the OTP authentication layer is compromised (i.e. the secret key is stolen, or the user's token is stolen), the password still provides a layer of protection.
 * Of course, the reason to use OTP in addition to passwords is that users have a tendency to choose weak passwords. This is mitigated with OTP authentication.
 * Furthermore, with a OTP, each password is used once (and only valid once), so stealing an old key is meaningless. Moreover, the OTP password is not reused between multiple applications,
 * so a compromise to another service does not compromise our service.
 * At this point we would need to decide whether or not to use S/KEY vs other OTP implementations, like TOTP.
 * 
 * Advantages of S/KEY vs other OTP:
 * * doesn't change with time, so avoids frustrating the user :-)
 * * doesn't require time synchronization -- we have seen this be a problem on phones with out-of-synch clocks.
 * * server doesn't have to store any secrets (this is a big deal -- server compromises don't require the user's secret to be reset)
 *
 * Downsides of S/KEY compared to other OTP:
 * * can be vulnerable to brute forcing.
 * ** in order to mitigate this, the OTP password is long
 * * only good for a finite number of authentications.
 * 
 * S/KEY is a strong contender for devices with cheap storage space and fast processing, or for situations where the server's state is public for some reason.
 */

/* 3. (Will not affect your grade:) How long did you spend on this project?
 // About 6 hours of light work. A tremendous amount of it was spent dealing with a transposition error in javascript -- we wrote Math.pow(x, 2) instead of Math.pow(2, x). This was frustrating :-(.
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

function bit_array_to_string(bit_array) {
	return "" + bit_array[0];
}

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
      start: seed,
			pebbles: []
    }

		chain.layout_initial_pebbles();

		return chain.state.current_hash;
  }

	chain.layout_initial_pebbles = function () {
		var num_pebbles = log2(chain.state.num_iterations);
		var cur_hash = chain.state.start;

		for (var i = chain.state.num_iterations; i >= 1; i--) {
			cur_hash = hash(cur_hash);

			if (Math.floor(log2(i)) == log2(i)) {
				chain.state.pebbles.push(cur_hash);
			}
		}

		chain.state.pebbles = chain.state.pebbles.reverse();
		// add a dummy pebble at the end for convenience sake!
		chain.state.pebbles[num_pebbles] = hash(chain.state.start);

		chain.state.current_hash = hash(cur_hash);
	}
	
  chain.advance = function() {
		if (is_equal(chain.state.current_hash, hash(chain.state.start))) { return null; }

		chain.state.current_hash = chain.state.pebbles[0];
		// p_n needs to move backwards, and p_{n-1} has already moved, it is invalid to assign p_n = p_{n-1}
		// so, we track that here.
		var previous_has_moved = false;
		
		for (var i = log2(chain.state.num_iterations) - 1; i >= 0; i--) {
			if (chain.state.current_hash == chain.state.pebbles[i]) {
				if (!previous_has_moved) {
					chain.state.pebbles[i] = chain.state.pebbles[i+1];
				} else {
					var current_hash = chain.state.pebbles[i+1];
					for (var j = 0; j < Math.pow(2, i); j++) { current_hash = hash(current_hash); }
					chain.state.pebbles[i] = current_hash;
				}

				previous_has_moved = true;
			} else {
				previous_has_moved = false;
			}
		}

		
		return chain.state.current_hash;
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

/********* Export functions for testing. ********/


module.exports.naive_chain = naive_chain;
module.exports.pebble_chain = pebble_chain;


/********* End of Original File ********/
