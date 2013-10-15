#include <v8.h>
#include <node.h>
#include <node_buffer.h>

#include <errno.h>
#include <string.h>
#include <iconv.h>
#include <stdlib.h>

using namespace v8;
using namespace node;



class IconvError {

    public:

        IconvError(int errorno, const char *syscall, const char *msg): errorno(errorno), syscall(syscall), msg(msg) { }

        int errorno;
        const char *syscall;
        const char *msg;

};

class Iconv {

    public:

        Iconv(const char *tocode, const char *fromcode) {
            cd = iconv_open(tocode, fromcode);
            if (cd == (iconv_t)(-1))
                throw IconvError(errno, "iconv_open", "Conversion not supported.");
        }

        ~Iconv() {
            iconv_close(cd);
        }

        size_t convert(char **inbuf, size_t *inbytesleft, char **outbuf, size_t *outbytesleft) {
            size_t r;
            r = iconv(cd, inbuf, inbytesleft, outbuf, outbytesleft);
            return (r == (size_t)(-1)) ? r : iconv(cd, NULL, NULL, outbuf, outbytesleft);
        }

        static void Initialize(Handle<Object> target) {
            HandleScope scope;

            // function Iconv () {}
            Local<FunctionTemplate> t = FunctionTemplate::New(Iconv::New);
            t->InstanceTemplate()->SetInternalFieldCount(1);
            t->SetClassName(String::NewSymbol("Iconv"));

            // Iconv.prototype.convert
            t->PrototypeTemplate()->Set(
                String::NewSymbol("convert"),
                FunctionTemplate::New(Iconv::Convert)->GetFunction());

            // target.Iconv = Iconv
            target->Set(String::NewSymbol("Iconv"), t->GetFunction());

            // target.canonicalize
            target->Set(
                String::NewSymbol("canonicalize"),
                FunctionTemplate::New(Iconv::Canonicalize)->GetFunction());

            // target.encodings
            target->SetAccessor(
                String::NewSymbol("encodings"),
                EncodingsGetter);
        }

        static Handle<Value> EncodingsGetter(Local<String> , const AccessorInfo& ) {
            HandleScope scope;
            Local<Array> encodings = Array::New();
            iconvlist(Iconv::getEncodings, &encodings);
            return scope.Close(encodings);
        }

        static Handle<Value> New(const Arguments &args) {
            HandleScope scope;

            Handle<Object> that = args.This();
            if (!args.IsConstructCall())
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
                return ThrowException(ErrnoException(exp.errorno, exp.syscall, exp.msg));
            }

            return that;
        }

        static Handle<Value> Canonicalize(const Arguments &args) {
            HandleScope scope;

            if (!args[0]->IsString())
                return ThrowException(Exception::Error(String::New("First parameter must be a string code")));
            Local<Value> argv[0];
            Handle<Object> code = args[0]->ToObject();
            Local<Function> touppercase = Local<Function>::Cast(code->Get(String::NewSymbol("toUpperCase")));
            Handle<Value> codeuc = touppercase->Call(code, 0, argv);
            String::AsciiValue acode(codeuc);
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
            size_t source_left = source_length;
            char *target_data = Buffer::Data(target_obj);
            size_t target_length = Buffer::Length(target_obj);
            size_t target_left = target_length;
            size_t r = ic->convert(&source_data, &source_left, &target_data, &target_left);

            Local<Object> obj = Object::New();
            obj->Set(String::NewSymbol("offsetIn"), Integer::NewFromUnsigned(source_length - source_left));
            obj->Set(String::NewSymbol("offsetOut"), Integer::NewFromUnsigned(target_length - target_left));
            obj->Set(String::NewSymbol("code"), Integer::New(r));
            if (r == (size_t)-1) {
                obj->Set(String::NewSymbol("error"), String::New(strerror(errno)));
                if (errno == E2BIG) {
                    obj->Set(String::NewSymbol("errno"), String::New("E2BIG"));
                    obj->Set(String::NewSymbol("error"), String::New("There is not sufficient room at *outbuf"));
                } else if (errno == EILSEQ) {
                    obj->Set(String::NewSymbol("errno"), String::New("EILSEQ"));
                    obj->Set(String::NewSymbol("error"), String::New("An invalid multibyte sequence has been encountered in the input"));
                } else if (errno == EINVAL) {
                    obj->Set(String::NewSymbol("errno"), String::New("EINVAL"));
                    obj->Set(String::NewSymbol("error"), String::New("An incomplete multibyte sequence has been encountered in the input"));
                }
            }
            return scope.Close(obj);
        }

        static int getEncodings(unsigned int namescount, const char * const * names, void* data) {
            Local<Array> array = *(Local<Array>*)data;
            Local<Value> push_ = array->Get(String::NewSymbol("push"));
            Local<Function> push = Local<Function>::Cast(push_);
            unsigned int i;
            const char *name;
            for (i=0; i < namescount; ++i) {
                name = names[i];
                Handle<Value> encode[] = {String::New(name)};
                push->Call(array, 1, encode);
            }
            return 0;
        }

    private:
        iconv_t cd;

};

void init(Handle<Object> target) {
    Iconv::Initialize(target);
}

NODE_MODULE(iconv, init)
