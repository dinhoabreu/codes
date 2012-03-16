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
				"we get a Error": function (error, data) {
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
				"we get 'a'e'i'o'uc": function (error, data) {
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
				"we get hex('e1e9edf3fae7')": function (error, data) {
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
				"we get hex('e1e9edf3fae7')": function (error, data) {
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
			"we get hex('feff00e100e900ed00f300fa000a00e7000a')": function (error, data) {
				assert.isNull(error);
				assert.equal(data.toString('hex'), 'feff00e100e900ed00f300fa000a00e7000a');
			}
		}
	}
}).export(module);
