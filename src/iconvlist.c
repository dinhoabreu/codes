#include <stdio.h>
#include <iconv.h>

int echo(unsigned int namescount, const char * const * names, void* data) {
    int i;
    const char *name;
    for (i=0; i < namescount; ++i) {
        name = names[i];
        printf("\t%s", name);
    }
    printf("\n");
    return 0;
}

int main() {
    iconvlist(echo, NULL);
    return 0;
}
