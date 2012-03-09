import Options
from os.path import join, abspath

srcdir = '.'
blddir = 'build'
VERSION = '0.0.1'

def set_options(opt):
  opt.tool_options('compiler_cxx')

def configure(conf):
  depdir = abspath('deps/libiconv-1.14')
  conf.check_tool('compiler_cxx')
  conf.check_tool('node_addon')
  if conf.check(lib='iconv', includes=[join(depdir,'include')], libpath=[join(depdir,'lib')], uselib_store='ICONV'):
    conf.env.append_value("LINKFLAGS_DL", "-liconv")
  else:
    conf.fatal('Library iconv not found')

def build(bld):
  iconv = bld.new_task_gen('cxx', 'shlib', 'node_addon')
  iconv.includes = '/usr/include /usr/local/include src'
  iconv.target = 'iconv_binding'
  iconv.source = 'src/iconv_binding.cc'
  iconv.uselib = "ICONV"
