import { createRequire } from 'node:module';
import path from 'node:path';

export default {
  path: path.dirname(createRequire(import.meta.url).resolve('egg-bin')),
};
