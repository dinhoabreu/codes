var bind = require('../build/Release/iconv_binding');
var stream = require('stream');
var util = require('util');

function create(options) {
	var from = options.from || 'UTF-8',
			to = options.to,
			size = options.size || 8192,
			iconv;
	from = bind.canonicalize(from);
	to = bind.canonicalize(to);
	if (options.option)
		to += options.option;
	iconv = new bind.Iconv(to, from);
	return {from: from, to: to, size: size, iconv: iconv};
}

function IconvStream(options) {
	var h = create(options);
	this.options = options;
	this._iconv = h.iconv;
	this._input = new Buffer(h.size);
	this._input.start = 0;
	this._output = new Buffer(h.size);
	this.fromCode = h.from;
	this.toCode = h.to;
	this.size = h.size;
	this.readable = true;
	this.writable = true;
}
util.inherits(IconvStream, stream.Stream);

IconvStream.prototype.write = function (data) {
	if (!this.writable) {
		this.emit('error', new Error('stream not writable'))	
		return false;
	}
  if (!Buffer.isBuffer(data)) {
    var encoding = 'utf8';
    if (typeof(arguments[1]) == 'string') encoding = arguments[1];
    data = new Buffer('' + data, encoding);
  }
	var input = this._input;
	var output = this._output;
	var start = 0;
	var end = data.length;
	while (start < end) {
		var offset = Math.min(end - start, input.length - input.start);
		data.copy(input, input.start, start, start + offset);
		var chunk = input.slice(0, input.start + offset);
		this._write(chunk);
		start += offset;
	}
	return true;
}

IconvStream.prototype.end = function (data) {
	if (data)
		this.write.apply(this, arguments);
	if (this.writable) {
		if (this.error)
			this.emit('error', this.error);
		this.emit('end');
	}
	this.writable = false;
}

IconvStream.prototype._write = function (chunk) {
	var input = this._input;
	chunk.stop = false;
	while (chunk.length > 0 && !chunk.stop)
		chunk = this._convert(chunk);
	if (chunk.length > 0) {
		chunk.copy(input);
		input.start = chunk.length;
	} else {
		input.start = 0;
	}
}

IconvStream.prototype._convert = function (chunk) {
	var iconv = this._iconv;
	var output = this._output;
	var r = iconv.convert(chunk, output);
	var chunkEnd = chunk.length - r.leftBytesIn;
	var outputEnd = output.length - r.leftBytesOut;
	var chunk = chunk.slice(chunkEnd);
	var data = output.slice(0, outputEnd);
	chunk.stop = true;
	if (data.length)
		this.emit('data', data);
	delete this.error;
	if (r.code == -1) {
		switch (r.errno) {
		case 'E2BIG':
			chunk.stop = false;
			break;
		case 'EILSEQ':
			var error = new Error(r.error);
			error.code = r.errno;
			chunk = chunk.slice(chunkEnd + 1);
			this.emit('error', error);
			return chunk.slice(0, 0);
			break;
		case 'EINVAL':
			var error = new Error(r.error);
			error.code = r.errno;
			this.error = error;
			break;
		}
	}
	return chunk;
}

exports.createStream = function (options) {
	return new IconvStream(options);
}
exports.convert = function (input, options) {
	if (typeof input == 'string')
		input = new Buffer(input, 'utf8');
	var h = create(options);
	var output = new Buffer(input.length * 2);
	var r = h.iconv.convert(input, output);
	var outputEnd = output.length - r.leftBytesOut;
	return output.slice(0, outputEnd);
}
exports.encodings = bind.encodings;
exports.TRANSLIT = '//TRANSLIT';
exports.IGNORE = '//IGNORE';
