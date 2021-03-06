var assert = require('assert');
var vows = require('vows');
var events = require('events');
var codes = require('../index');

function write(str, stream) {
	var data = new Buffer(str);
	stream.write(str);
	stream.end();
}

vows.describe('Convert charset by Codes').addBatch({
	'UTF8 to ASCII': {
		topic: function () {
			return codes.createStream('ascii', 'utf-8');
		},
		'when got CodesStream instance': function (ex) {
			assert.instanceOf(ex, codes.CodesStream);
		}
	},
	'UTF-8 to ASCII': {
		'without TRANSLIT': {
			topic: function () {
				return codes.createStream('ascii', 'utf-8');
			},
			'when write "áéíóúç"': {
				topic: function (stream) {
					var promise = new events.EventEmitter();
					stream.on('data', function (data) {
						promise.emit('success', data);
					});
					stream.on('error', function (error) {
						promise.emit('error', error);
					});
					process.nextTick(function () {
						write('áéíóúç', stream);
					});
					return promise;
				},
				"we got a Error": function (error, data) {
					assert.isNotNull(error);
					assert.isUndefined(data);
				}
			}
		},
		'with TRANSLIT': {
			topic: function () {
				return codes.createStream('ascii//TRANSLIT', 'utf-8');
			},
			'when write "áéíóúç"': {
				topic: function (stream) {
					var promise = new events.EventEmitter();
					stream.on('data', function (data) {
						promise.emit('success', data);
					});
					stream.on('error', function (error) {
						promise.emit('error', error);
					});
					process.nextTick(function () {
						write('áéíóúç', stream);
					});
					return promise;
				},
				"we got 'a'e'i'o'uc": function (error, data) {
					assert.isNull(error);
					assert.equal(data.toString(), "'a'e'i'o'uc");
				}
			}
		}
	},
	'UTF-8 to Latin1': {
		'without TRANSLIT': {
			topic: function () {
				return codes.createStream('latin1', 'utf-8');
			},
			'when write "áéíóú"': {
				topic: function (stream) {
					var promise = new events.EventEmitter();
					stream.on('data', function (data) {
						promise.emit('success', data);
					});
					stream.on('error', function (error) {
						promise.emit('error', error);
					});
					process.nextTick(function () {
						write('áéíóúç', stream);
					});
					return promise;
				},
				"we got hex('e1e9edf3fae7')": function (error, data) {
					assert.isNull(error);
					assert.equal(data.toString('hex'), 'e1e9edf3fae7');
				}
			}
		},
		'with TRANSLIT': {
			topic: function () {
				return codes.createStream('latin1//TRANSLIT', 'utf-8');
			},
			'when write "áéíóú"': {
				topic: function (stream) {
					var promise = new events.EventEmitter();
					stream.on('data', function (data) {
						promise.emit('success', data);
					});
					stream.on('error', function (error) {
						promise.emit('error', error);
					});
					process.nextTick(function () {
						write('áéíóúç', stream);
					});
					return promise;
				},
				"we got hex('e1e9edf3fae7')": function (error, data) {
					assert.isNull(error);
					assert.equal(data.toString('hex'), 'e1e9edf3fae7');
				}
			}
		}
	},
	'UTF-8 to UTF-16': {
		topic: function () {
			return codes.createStream('utf-16', 'utf-8');
		},
		'streaming file "input.txt"': {
			topic: function (stream) {
				var reader = require('fs').createReadStream(__dirname + '/input.txt');
				var promise = new events.EventEmitter();
				stream.on('data', function (data) {
					promise.emit('success', data);
				});
				stream.on('error', function (error) {
					promise.emit('error', error);
				});
				reader.pipe(stream);
				return promise;
			},
			"we got hex('feff00e100e900ed00f300fa000a00e7000a')": function (error, data) {
				assert.isNull(error);
				assert.equal(data.toString('hex'), 'feff00e100e900ed00f300fa000a00e7000a');
			}
		}
	},
	'Test Big Buffer - UTF-8 to UTF-16LE': {
		topic: function () {
			var c = codes.create('UTF-16LE', 'UTF-8');
			var utf8 = new Buffer(20000000);
			for (var i = 0; i < utf8.length; i++) {
				utf8[i] = 97 + i % 26; // cycle from 'a' to 'z'.
			}
			var utf16 = c.convert(utf8);
			return [utf8, utf16];
		},
		'we got a double length': function (a) {
			assert.equal(a[1].length, a[0].length * 2);
		},
		'we got the same characters': function (a) {
			var utf8 = a[0], utf16 = a[1];
			for (i = 0; i < utf8.length; ++i) {
				assert.equal(utf16[i * 2], utf8[i]);
				assert.equal(utf16[i * 2 + 1], 0);
			}
		}
	},
	'UTF-8 to UTF-7 (bug reported by welwood08)': {
		'"test"': {
			topic: function () {
				return codes.create('UTF-7', 'UTF-8');
			},
			'we got +ACI-test+ACI-': function (c) {
				var input = new Buffer('"test"', 'utf8');
				var output = c.convert(input);
				assert.equal('+ACI-test+ACI-', output.toString('ascii'));
			}
		}
	},
	'UTF-7 to UTF-8 (bug reported by welwood08)': {
		'+ACI-test+ACI-': {
			topic: function () {
				return codes.create('UTF-8', 'UTF-7');
			},
			'we got "test"': function (c) {
				var input = new Buffer('+ACI-test+ACI-', 'ascii');
				var output = c.convert(input);
				assert.equal('"test"', output.toString());
			}
		}
	}
}).export(module);
