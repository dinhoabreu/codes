var bind = require('./build/Release/iconv'),
    stream = require('stream'),
    util = require('util');

function create(to, from, options) {
    var from = from || 'utf8',
        to = to.split('//'),
        size = options && options.size || 8192,
        iconv;
    from = exports.canonicalize(from);
    to[0] = exports.canonicalize(to[0]);
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
    this._buffer = new Buffer(0);
    this.fromCode = h.from;
    this.toCode = h.to;
    this.size = h.size;
    this.readable = true;
    this.writable = true;
}

util.inherits(CodesStream, stream.Stream);

CodesStream.prototype.setEncoding = function (encoding) {
    this._encoding = encoding;
}

CodesStream.prototype.pause = function () {
    this._paused = true;
}

CodesStream.prototype.resume = function () {
    if (this._paused) {
        this._paused = false;
        if (this.write(this._buffer)) {
            this._buffer = new Buffer(0);
            this.emit('drain')
        }
    }
}

CodesStream.prototype.write = function (data) {
    if (!this.writable) {
        this.readable = false;
        this.emit('error', new Error('stream not writable'))
        return false;
    }
    if (!Buffer.isBuffer(data)) {
        var encoding = 'utf8';
        if (typeof(arguments[1]) == 'string') encoding = arguments[1];
        data = new Buffer('' + data, encoding);
    }
    if (this._paused) {
        var buffer = new Buffer(this._buffer.length + data.length);
        this._buffer.copy(buffer);
        data.copy(buffer, this._buffer.length);
        this._buffer = buffer;
        return false;
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
        if (this.error) {
            this.readable = false;
            this.emit('error', this.error);
        }
        this.readable = false;
        this.writable = false;
        this.emit('end');
    }
}

CodesStream.prototype._write = function (chunk) {
    var input = this._input;
    chunk.end = false;
    while (chunk.length > 0 && !chunk.end)
        chunk = this._convert(chunk);
    if (chunk.length > 0) {
        chunk.copy(input);
        input.start = chunk.length;
    } else {
        input.start = 0;
    }
}

CodesStream.prototype._convert = function (input) {
    var iconv = this._iconv,
        output = this._output,
        r = iconv.convert(input, output),
        offsetIn = r.offsetIn,
        input = input.slice(offsetIn),
        output = output.slice(0, r.offsetOut);
    input.end = true;
    if (output.length) {
        if (this._encoding)
            this.emit('data', output.toString(this._encoding));
        else
            this.emit('data', output);
    }
    delete this.error;
    if (r.code == -1) {
        switch (r.errno) {
        case 'E2BIG':
            input.end = false;
            break;
        case 'EILSEQ':
            var error = new Error(r.error);
            error.code = r.errno;
            input = input.slice(offsetIn + 1);
            this.readable = false;
            this.emit('error', error);
            return input.slice(0, 0);
            break;
        case 'EINVAL':
            var error = new Error(r.error);
            error.code = r.errno;
            this.error = error;
            break;
        }
    }
    return input;
}

function Codes(to, from, options) {
    var h = create(to, from, options);
    this.toCode = h.to;
    this.fromCode = h.from;
    this.size = h.size;
    this._iconv = h.iconv;
}

Codes.prototype.convert = function (input) {
    var output = new Buffer(input.length * 4),
            r = this._iconv.convert(input, output);
    if (r.code == -1)
        throw new Error(r.error);
    return output.slice(0, r.offsetOut);
}

exports.CodesStream = CodesStream;

exports.Codes = Codes;

exports.createStream = function (to, from, options) {
    return new CodesStream(to, from, options);
}

exports.create = function (to, from, options) {
    return new Codes(to, from, options);
}

exports.convert = function (input, to, from, options) {
    options = options || {};
    options.size = Math.ceil(input.length * 4 / 8192) * 8192;
    var stream = new CodesStream(to, from, options),
            error, output;
    stream.on('error', function (err) {
        error = err;
    });
    stream.on('data', function (data) {
        output = data;
    });
    stream.end(input);
    if (error)
        throw error;
    return output;
}

exports.encode = function (input, to, options) {
    return this.convert(input, to, 'utf8', options);
}

exports.decode = function (input, from, options) {
    return this.convert(input, 'utf8', from, options).toString();
}

exports.__defineGetter__('encodings', function () {
    return bind.encodings;
});

exports.canonicalize = (function () {
    var encodings = exports.encodings;
    var map = {}, reg = /[_.:-]/;
    for (var i = 0, len = encodings.length; i < len; ++i) {
        var enc = encodings[i];
        var key = enc.replace(reg, '').toLowerCase();
        map[key] = bind.canonicalize(enc);
    }
    return function (encoding) {
        return map[encoding.replace(reg, '').toLowerCase()];
    }
})();

exports.TRANSLIT = '//TRANSLIT';
exports.IGNORE = '//IGNORE';
