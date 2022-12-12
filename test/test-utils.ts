import path from 'path';
import coffee from 'coffee';
import { ForkOptions } from 'child_process';

export function fork(target: string, args: string[] = [], options: ForkOptions = {}) {
  const env = { ...(options.env || process.env), TS_NODE_PROJECT: path.resolve(__dirname, './tsconfig.json') };
  // or use coffee.beforeScript to register ts-node
  // TODO: refactor to clet
  const bin = path.join(__dirname, 'fixtures', target, 'bin/cli.ts');
  return coffee.fork(bin, args, {
    cwd: __dirname,
    execArgv: [ '-r', 'ts-node/register' ].concat(options.execArgv || []),
    ...options,
    env,
  });
}
