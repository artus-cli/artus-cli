import path from 'path';

export default {
  help: {
    enable: true,
    path: path.resolve(__dirname, '../plugins/plugin-help'),
  },

  version: {
    enable: true,
    path: path.resolve(__dirname, '../plugins/plugin-version'),
  },
};
