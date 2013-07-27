#include <stdio.h>
#include <iconv.h>
#include <errno.h>
#include <string.h>

int main() {
    const char *fromcode = iconv_canonicalize("utf8");
    const char *tocode = iconv_canonicalize("utf-16");
    size_t r;
    char inbuf[] = "áéíóúç";
    size_t inbytesleft = sizeof(inbuf)-2;
    char outbuf[256];
    size_t outbytesleft = 5;
    char *pinbuf = inbuf;
    char *poutbuf = outbuf;

    printf("%s > %s\n", fromcode, tocode);
    printf("%ld > %ld\n", inbytesleft, outbytesleft);
    iconv_t cd = iconv_open(tocode, fromcode);
    r = iconv(cd, &pinbuf, &inbytesleft, &poutbuf, &outbytesleft);
    iconv_close(cd);
    printf("return %ld %ld > %ld\n", r, inbytesleft, outbytesleft);
    if (r == -1) {
        if (errno == E2BIG)
            printf("E2BIG: There is not sufficient room at *outbuf\n");
        else if (errno == EILSEQ)
            printf("EILSEQ: An invalid multibyte sequence has been encountered in the input\n");
        else if (errno == EINVAL)
            printf("EINVAL: An incomplete multibyte sequence has been encountered in the input\n");
    }
    return 0;
}
