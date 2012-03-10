#!/bin/bash
PREFIX=$(pwd)/libiconv/

[ ! -d libiconv ] && mkdir libiconv

[ -f libiconv/include/iconv.h ] && exit 0

[ ! -d deps ] && mkdir deps

if [ ! -f deps/libiconv-1.14.tar.gz ]; then
	curl -o deps/libiconv-1.14.tar.gz http://ftp.gnu.org/pub/gnu/libiconv/libiconv-1.14.tar.gz
fi

if [ ! -d deps/libiconv-1.14 ]; then
	cd deps
	tar xzvf libiconv-1.14.tar.gz
	cd -
fi

cd deps/libiconv-1.14/
if [ ! -f Makefile ]; then
	./configure --prefix=$PREFIX --enable-static
fi;
make -s && make -s install
cd -

rm -rf deps/
exit 0
