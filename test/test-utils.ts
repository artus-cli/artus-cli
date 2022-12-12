import path from 'path';
import coffee from 'coffee';
import { ArtusApplication } from '@artus/core';
import { start, ApplicationOptions } from '@artus-cli/artus-cli';
import { CommandTrigger } from '../src/core/trigger';
import { ForkOptions } from 'child_process';

export function fork(target: string, args: string[] = [], options: ForkOptions = {}) {
  // or use coffee.beforeScript to register ts-node
  // TODO: refactor to clet
  const bin = path.join(__dirname, 'fixtures', target, 'bin/cli.ts');
  return coffee.fork(bin, args, {
    cwd: path.resolve(__dirname, '../'), // make sure TS_NODE_PROJECT is right
    execArgv: [ '-r', 'ts-node/register' ].concat(options.execArgv || []),
    ...options,
  });
}

export async function createApp(fixtureName: string, opt?: ApplicationOptions) {
  return start({ ...opt, baseDir: path.dirname(require.resolve(fixtureName)) });
}

export async function createCtx(app: ArtusApplication, argv: string[]) {
  const trigger = app.container.get(CommandTrigger);
  return trigger.initContext({
    params: {
      argv,
      env: { ...process.env },
      cwd: app.config.baseDir,
    },
  });
}
