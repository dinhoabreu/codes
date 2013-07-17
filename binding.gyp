{
    'targets': [
        {
            'target_name': 'iconv',
            'sources': [ 
                'src/iconv.cc'
            ],
            'include_dirs': [
                'build/deps/include'
            ],
            'cflags_cc': [
                '-fexceptions'
						],
            'cflags': [
                '-fexceptions'
            ],
            'libraries': [
                'deps/lib/libiconv.a'
            ],
            'conditions': [
                ['OS=="mac"', {
                    'xcode_settings': {
                        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
                    }
                }]
            ],
            'actions': [
                {
                    'action_name': 'deps_build',
                    'inputs': ['deps/build'],
                    'outputs': ['deps/lib/libiconv.a'],
                    'action': ['deps/build']
                }
            ]
        }
    ]
}
