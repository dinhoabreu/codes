{
    'targets': [
        {
            'target_name': 'iconv',
            'sources': [ 
                'src/iconv.cc'
            ],
            'include_dirs': [
                'libiconv/include'
            ],
            'cflags_cc': [
                '-fexceptions'
						],
            'cflags': [
                '-fexceptions'
            ],
            'libraries': [
                '../libiconv/lib/libiconv.a'
            ],
            'conditions': [
                ['OS=="mac"', {
                    'xcode_settings': {
                        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
                    }
                }]
            ]
        }
    ]
}
