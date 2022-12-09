import 'reflect-metadata';
import tsconfig from '../../tsconfig.json';
import { register } from 'tsconfig-paths';

register({
  baseUrl: tsconfig.compilerOptions.baseUrl,
  paths: tsconfig.compilerOptions.paths,
});
