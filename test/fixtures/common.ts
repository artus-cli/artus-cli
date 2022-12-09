import 'reflect-metadata';
import path from 'path';
import tsconfig from '../tsconfig.json';
import { register } from 'tsconfig-paths';

register({
  baseUrl: path.resolve(__dirname, '../../'),
  paths: tsconfig.compilerOptions.paths,
});
