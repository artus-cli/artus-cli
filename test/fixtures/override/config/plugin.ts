import path from 'path';

export default { 
  'egg-bin': {
    enable: true,
    path: path.dirname(require.resolve('egg-bin')),
  },    
};
