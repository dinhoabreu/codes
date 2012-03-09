var vows = require('vows');
var assert = require('assert');
var events = require('events');
var iconv = require('../lib/index');

function write(str, stream) {
	var data = new Buffer(str);
	stream.write(str);
	stream.end();
}

vows.describe('Convert charset by Codes').addBatch({
	'UTF-8 to ASCII': {
		'without TRANSLIT': {
			topic: function () {
				var options = {
					from: 'utf-8',
					to: 'ascii'
				};
				return iconv.createStream(options);
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
				var options = {
					from: 'utf-8',
					to: 'ascii',
					option: iconv.TRANSLIT
				};
				return iconv.createStream(options);
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
				var options = {
					from: 'utf-8',
					to: 'latin1'
				};
				return iconv.createStream(options);
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
				var options = {
					from: 'utf-8',
					to: 'latin1',
					option: iconv.TRANSLIT
				};
				return iconv.createStream(options);
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
			var options = {
				from: 'utf-8',
				to: 'utf-16'
			};
			return iconv.createStream(options);
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
				process.nextTick(function () {
					reader.pipe(stream);
				});
				return promise;
			},
			"we get hex('feff00e100e900ed00f300fa000a00e7000a')": function (error, data) {
				assert.isNull(error);
				assert.equal(data.toString('hex'), 'feff00e100e900ed00f300fa000a00e7000a');
			}
		}
	}
}).export(module);
