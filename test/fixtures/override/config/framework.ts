import { createRequire } from 'module';
import path from 'path';

export default {
  path: path.dirname(createRequire(import.meta.url).resolve('egg-bin')),
};
