import 'reflect-metadata';
import * as tsConfigPaths from 'tsconfig-paths';
import path from 'node:path';
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
const baseUrl = path.resolve(__dirname, '../');
let { paths } = tsConfigPaths.loadConfig(__dirname);
// if (process.env.RELEASE) {
//   // change to dist dir
//   paths['artus-cli'] = [ './' ];
// }

import { resolve as resolveTs, getFormat, transformSource, load } from 'ts-node/esm';
export { getFormat, transformSource, load };
Object.keys(paths).forEach(p => {
  paths[p] = paths[p].map(p => p.replace('.js', '.ts'));
});

const matchPath = tsConfigPaths.createMatchPath(baseUrl, paths);
export function resolve(specifier, context, defaultResolver) {
  const file = matchPath(specifier) || specifier;
  return resolveTs(file, context, defaultResolver);
}
