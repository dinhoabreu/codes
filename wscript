import Options
from os.path import join, abspath

srcdir = '.'
blddir = 'build'
VERSION = '0.0.1'

def set_options(opt):
  opt.tool_options('compiler_cxx')

def configure(conf):
  conf.env.append_value('CXXFLAGS', ['-Wall', '-O2'])
  depdir = abspath('libiconv')
  incdir = join(depdir,'include')
  libdir = join(depdir,'lib')
  conf.check_tool('compiler_cxx')
  conf.check_tool('node_addon')
  conf.check(staticlib='iconv', includes=[incdir], libpath=[libdir], uselib_store='iconv')

def build(bld):
  iconv = bld.new_task_gen('cxx', 'shlib', 'node_addon')
  iconv.includes = '/usr/include /usr/local/include src'
  iconv.target = 'iconv'
  iconv.source = 'src/iconv.cc'
  iconv.uselib = "iconv"
