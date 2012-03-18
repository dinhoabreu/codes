var assert = require('assert');
var codes = require('../index');

// convert from UTF-8 to ISO-8859-1
var str = 'É isso ai. Testando acentuação: áéíóú...';
var buffer = codes.encode(str, 'ISO-8859-1//TRANSLIT');
var str2 = codes.decode(buffer, 'ISO-8859-1');
assert.equal(str, str2);

// stream from LATIN1 to UTF-8 
var cs = codes.createStream('UTF-8', 'LATIN1');
var str4 = '';
cs.on('data', function (data) {
	var str3 = data.toString();
	console.log(str3);
	str4 += str3;
});
cs.on('end', function () {
	assert.equal(str4, str);
	console.log(str4);
});
cs.on('error', function (error) {
	console.log(error);
});
cs.write(buffer.slice(0,1));
cs.write(buffer.slice(1,8));
cs.write(buffer.slice(8,16));
cs.write(buffer.slice(16,24));
cs.write(buffer.slice(24, 28));
cs.write(buffer.slice(28, 32));
cs.write(buffer.slice(32));
cs.end();

// convert from UTF-8 to ASCII
var str = 'aéióuçÁEÍOÚC';
var ascii = codes.convert(str, 'ASCII//TRANSLIT', 'UTF-8');
console.log(str + ' => ' + ascii.toString());

// convert from UTF-8 to UTF-16LE
var cds = codes.create('utf16le', 'utf8');
var utf16 = cds.convert(new Buffer(str));
console.log(utf16);
