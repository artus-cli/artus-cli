import path from 'path';

export default {
  help: {
    enable: false,
  },
  version: false,
  artusCli: {
    enable: true,
    path: path.dirname(require.resolve('@artus-cli/artus-cli')),
  }, 
};
