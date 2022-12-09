import path from 'path';
import { createRequire } from 'module';

export default {
  path: path.dirname(createRequire(import.meta.url).resolve('artus-cli')),
};
