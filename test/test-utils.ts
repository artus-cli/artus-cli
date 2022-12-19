import path from 'path';
import coffee from 'coffee';
import fs from 'fs';
import assert from 'node:assert';
import { ArtusApplication } from '@artus/core';
import { start, ArtusCliOptions } from '@artus-cli/artus-cli';
import { CommandTrigger } from '../src/core/trigger';
import { ForkOptions } from 'child_process';

export function fork(target: string, args: string[] = [], options: ForkOptions = {}) {
  // or use coffee.beforeScript to register ts-node
  // TODO: refactor to clet
  const fixtureDir = path.resolve(__dirname, './fixtures/');
  const bin = [
    path.join(fixtureDir, target, 'bin/cli.ts'),
    path.join(fixtureDir, target, 'bin.ts'),
    path.join(fixtureDir, target, 'src/bin/cli.ts'),
    path.join(fixtureDir, target, 'src/bin.ts'),
  ].find(p => fs.existsSync(p));

  assert(bin, `${target} cannot found bin file`);
  return coffee.fork(bin, args, {
    cwd: path.resolve(__dirname, '../'), // make sure TS_NODE_PROJECT is right
    execArgv: [ '-r', 'ts-node/register' ].concat(options.execArgv || []),
    ...options,
  });
}

export async function createApp(fixtureName: string, opt?: ArtusCliOptions) {
  process.argv = [];
  return (await start({ ...opt, baseDir: path.dirname(require.resolve(`${fixtureName}/package.json`)) }))!;
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
