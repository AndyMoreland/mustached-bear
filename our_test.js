var skey = require("./skey.js")
var sjcl = require("./lib/sjcl");
var hash = sjcl.hash.sha256.hash; // Hashes a string or bitArray to a bitArray.
hash = function (x) { return x + 1 }

function bit_array_to_string(bit_array) {
		return bit_array;
		return "" + bit_array[0];
}

var chain = skey.pebble_chain();

var start = chain.initialize(16, "hi");
var hashes = [];

console.log("Start: ", bit_array_to_string(start));

for (var i = 0; i < 17; i++) {
		var next = chain.advance();
		hashes.push(next);
}

for (var j = 0; j < hashes.length; j++) {
		console.log("Hash ", j + 1, " ", bit_array_to_string(hashes[j]), "----", bit_array_to_string(hash(hashes[j])), "----", bit_array_to_string(hash(hash(hashes[j]))));
}

exports.hash_chain = hashes;
