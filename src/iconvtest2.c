#include <stdio.h>
#include <iconv.h>
#include <errno.h>
#include <string.h>

int main() {
    const char *fromcode = iconv_canonicalize("utf-8");
    const char *tocode = iconv_canonicalize("utf-7");
    size_t r;
    char inbuf[] = "\"test\"";
    size_t inbytesleft = strlen(inbuf);
    char outbuf[256];
    size_t outbytesleft = 256;
    char *pinbuf = inbuf;
    char *poutbuf = outbuf;
    int _errno;

    printf("%s > %s\n", fromcode, tocode);
    printf("%ld > %ld\n", inbytesleft, outbytesleft);
    iconv_t cd = iconv_open(tocode, fromcode);
    if (cd == (iconv_t)-1) {
        if (errno == EINVAL)
            printf("EINVAL: The conversion from %s to %s is not supported by the implementation\n", fromcode, tocode);
        return 1;
    }
    r = iconv(cd, &pinbuf, &inbytesleft, &poutbuf, &outbytesleft);
    if (r == 0)
        r = iconv(cd, NULL, NULL, &poutbuf, &outbytesleft);
    _errno = errno;
    iconv_close(cd);
    printf("return %ld %ld > %ld\n", r, inbytesleft, outbytesleft);
    if (r == -1) {
        if (_errno == E2BIG)
            printf("E2BIG: There is not sufficient room at *outbuf\n");
        else if (_errno == EILSEQ)
            printf("EILSEQ: An invalid multibyte sequence has been encountered in the input\n");
        else if (_errno == EINVAL)
            printf("EINVAL: An incomplete multibyte sequence has been encountered in the input\n");
    } else {
        printf("%s\n", outbuf);
    }
    return 0;
}
