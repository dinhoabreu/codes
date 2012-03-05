#include <v8.h>
#include <node.h>
#include <node_buffer.h>

#include <errno.h>
#include <string.h>
#include <iconv.h>
#include <stdlib.h>

using namespace v8;
using namespace node;

static Persistent<String> push_sym;
static Persistent<String> convert_sym;
static Persistent<String> iconv_sym;
static Persistent<String> canonicalize_sym;
static Persistent<String> encodings_sym;

static int get_encodings(unsigned int namescount, const char * const * names, void* data) {
	Local<Array> array = *(Local<Array>*)data;
	Local<Value> push_ = array->Get(push_sym);
	Local<Function> push = Local<Function>::Cast(push_);
	int i;
	const char *name;
	for (i=0; i < namescount; ++i) {
		name = names[i];
		Handle<Value> encode[] = {String::New(name)};
		push->Call(array, 1, encode);
	}
	return 0;
}


class IconvError {
	public:
		IconvError(const char *fromcode, const char *tocode) { 
			snprintf(error, 256, "The conversion from '%s' to '%s' is not supported", fromcode, tocode);
		}
		char error[256];
};

class Iconv {
	public:
		Iconv(const char *tocode, const char *fromcode) {
			cd = iconv_open(tocode, fromcode);
			if (cd == (iconv_t)(-1))
				throw IconvError(fromcode, tocode);
		}
		~Iconv() {
			iconv_close(cd);
		}
		size_t convert(char **inbuf, size_t *inbytesleft, char **outbuf, size_t *outbytesleft) {
			return iconv(cd, inbuf, inbytesleft, outbuf, outbytesleft);
		}

		static void Initialize(Handle<Object> target) {
			HandleScope scope;

  			push_sym = Persistent<String>::New(String::NewSymbol("push"));
  			convert_sym = Persistent<String>::New(String::NewSymbol("convert"));
  			iconv_sym = Persistent<String>::New(String::NewSymbol("Iconv"));
  			canonicalize_sym = Persistent<String>::New(String::NewSymbol("canonicalize"));
  			encodings_sym = Persistent<String>::New(String::NewSymbol("encodings"));

			leftBytesIn_sym = Persistent<String>::New(String::NewSymbol("leftBytesIn"));
			leftBytesOut_sym = Persistent<String>::New(String::NewSymbol("leftBytesOut"));
			code_sym = Persistent<String>::New(String::NewSymbol("code"));
			errno_sym = Persistent<String>::New(String::NewSymbol("errno"));
			error_sym = Persistent<String>::New(String::NewSymbol("error"));

			// function Iconv () {}
			Handle<FunctionTemplate> iconv_new = FunctionTemplate::New(Iconv::New);
			constructor_template = Persistent<FunctionTemplate>::New(iconv_new);
			constructor_template->InstanceTemplate()->SetInternalFieldCount(1);
			constructor_template->SetClassName(iconv_sym);

			// Iconv.prototype.convert
			constructor_template->PrototypeTemplate()->Set(
				convert_sym,
			 	FunctionTemplate::New(Iconv::Convert)->GetFunction());

			// target.Iconv = Iconv
			target->Set(iconv_sym, constructor_template->GetFunction());

			// target.canonicalize
			target->Set(
				canonicalize_sym,
			 	FunctionTemplate::New(Iconv::Canonicalize)->GetFunction());

			// target.encodings 
			target->SetAccessor(
				encodings_sym,
				EncodingsGetter);
		}

		static Handle<Value> EncodingsGetter(Local<String> property, const AccessorInfo& info) {
			HandleScope scope;
			Local<Array> encodings = Array::New();
			iconvlist(get_encodings, &encodings);
			return scope.Close(encodings);
		}

		static Handle<Value> New(const Arguments &args) {
			HandleScope scope;

			Handle<Object> that = args.This();
			if (!that->IsObject() || !constructor_template->HasInstance(that->ToObject()))
				return ThrowException(Exception::Error(String::New("Iconv must be constructed with 'new'")));

			if (!args[0]->IsString())
				return ThrowException(Exception::Error(String::New("Iconv must be constructed with a to code")));
			if (!args[1]->IsString())
				return ThrowException(Exception::Error(String::New("Iconv must be constructed with a from code")));

			Handle<String> tocode = args[0]->ToString();
			Handle<String> fromcode = args[1]->ToString();
			String::AsciiValue atocode(tocode);
			String::AsciiValue afromcode(fromcode);

			try {
				Iconv *ic = new Iconv(*atocode, *afromcode);
				that->SetInternalField(0, External::New(ic));
			} catch (IconvError exp) {
				return ThrowException(Exception::Error(String::New(exp.error)));
			}

			return that;
		}
		static Handle<Value> Canonicalize(const Arguments &args) {
			HandleScope scope;

			if (!args[0]->IsString())
				return ThrowException(Exception::Error(String::New("First parameter must be a string code")));
			Handle<String> code = args[0]->ToString();
			String::AsciiValue acode(code);
			Handle<String> code_ = String::New(iconv_canonicalize(*acode));
			return scope.Close(code_);
		}
		static Handle<Value> Convert(const Arguments &args) {
			HandleScope scope;
			
			if (args.Length() != 2)
				return ThrowException(Exception::Error(String::New("Iconv.prototype.convert must receive exactly 2 ")));
			if (!Buffer::HasInstance(args[0]))
				return ThrowException(Exception::Error(String::New("First argument needs to be a buffer")));
			if (!Buffer::HasInstance(args[1]))
				return ThrowException(Exception::Error(String::New("Second argument needs to be a buffer")));


			Handle<Object> that = args.This();
			Local<External> wrap = Local<External>::Cast(that->GetInternalField(0));
			Iconv *ic = (Iconv *)wrap->Value();

			Local<Object> source_obj = args[0]->ToObject();
			Local<Object> target_obj = args[1]->ToObject();
			char *source_data = Buffer::Data(source_obj);
			size_t source_length = Buffer::Length(source_obj);
			char *target_data = Buffer::Data(target_obj);
			size_t target_length = Buffer::Length(target_obj);
			size_t r = ic->convert(&source_data, &source_length, &target_data, &target_length);

			Local<Object> obj = Object::New();
			obj->Set(leftBytesIn_sym, Integer::NewFromUnsigned(source_length));
			obj->Set(leftBytesOut_sym, Integer::NewFromUnsigned(target_length));
			obj->Set(code_sym, Integer::New(r));
			if (r == -1) {
				obj->Set(error_sym, String::New(strerror(errno)));
				if (errno == E2BIG) {
					obj->Set(errno_sym, String::New("E2BIG"));
					obj->Set(error_sym, String::New("There is not sufficient room at *outbuf"));
				} else if (errno == EILSEQ) {
					obj->Set(errno_sym, String::New("EILSEQ"));
					obj->Set(error_sym, String::New("An invalid multibyte sequence has been encountered in the input"));
				} else if (errno == EINVAL) {
					obj->Set(errno_sym, String::New("EINVAL"));
					obj->Set(error_sym, String::New("An incomplete multibyte sequence has been encountered in the input"));
				}
			}
			return scope.Close(obj);
		}
		static Persistent<FunctionTemplate> constructor_template;
		static Persistent<String> leftBytesIn_sym;
		static Persistent<String> leftBytesOut_sym;
		static Persistent<String> code_sym;
		static Persistent<String> errno_sym;
		static Persistent<String> error_sym;
	private:
		iconv_t cd;
};

Persistent<FunctionTemplate> Iconv::constructor_template;
Persistent<String> Iconv::leftBytesIn_sym;
Persistent<String> Iconv::leftBytesOut_sym;
Persistent<String> Iconv::code_sym;
Persistent<String> Iconv::errno_sym;
Persistent<String> Iconv::error_sym;

void init(Handle<Object> target) {
	Iconv::Initialize(target);
}
NODE_MODULE(iconv_binding, init)
