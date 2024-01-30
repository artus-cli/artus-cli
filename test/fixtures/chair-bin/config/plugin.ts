import path from 'path';

export default {
  codegen: {
    enable: true,
    package: 'plugin-codegen',
  },

  codegenExtra: {
    enable: true,
    package: 'plugin-codegen-extra',
  },

  'egg-bin': {
    enable: true,
    path: path.dirname(require.resolve('egg-bin')),
  },    
};
