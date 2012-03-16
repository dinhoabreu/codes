var bind = require('./build/Release/iconv');
var stream = require('stream');
var util = require('util');

function create(to, from, options) {
	var from = from || 'UTF-8',
			to = to.split('//'),
			size = options && options.size || 8192,
			iconv;
	from = bind.canonicalize(from);
	to[0] = bind.canonicalize(to[0]);
	to = to.join('//');
	iconv = new bind.Iconv(to, from);
	return {from: from, to: to, size: size, iconv: iconv};
}

function CodesStream(to, from, options) {
	var h = create(to, from, options);
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
util.inherits(CodesStream, stream.Stream);

CodesStream.prototype.write = function (data) {
	if (!this.writable) {
		this.emit('error', new Error('stream not writable'))	
		return false;
	}
  if (!Buffer.isBuffer(data)) {
    var encoding = 'UTF-8';
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

CodesStream.prototype.end = function (data) {
	if (data)
		this.write.apply(this, arguments);
	if (this.writable) {
		if (this.error)
			this.emit('error', this.error);
		this.emit('end');
	}
	this.writable = false;
}

CodesStream.prototype._write = function (chunk) {
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

CodesStream.prototype._convert = function (chunk) {
	var iconv = this._iconv;
	var output = this._output;
	var r = iconv.convert(chunk, output);
	var offsetIn = r.offsetIn;
	var chunk = chunk.slice(offsetIn);
	var data = output.slice(0, r.offsetOut);
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
			chunk = chunk.slice(offsetIn + 1);
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

exports.CodesStream = CodesStream;
exports.createStream = function (to, from, options) {
	return new CodesStream(to, from, options);
}
exports.convert = function (input, to, from, options) {
	if (typeof input == 'string')
		input = new Buffer(input, 'UTF-8');
	var h = create(to, from, options);
	var output = new Buffer(input.length * 4);
	var r = h.iconv.convert(input, output);
	return output.slice(0, r.offsetOut);
}
exports.encode = function (input, to, options) {
	return this.convert(input, to, 'UTF-8', options);
}
exports.decode = function (input, from, options) {
	return this.convert(input, 'UTF-8', from, options).toString();
}
exports.encodings = bind.encodings;
exports.canonicalize = bind.canonicalize;
exports.TRANSLIT = '//TRANSLIT';
exports.IGNORE = '//IGNORE';
