import 'reflect-metadata';
import { ArtusApplication, Scanner } from '@artus/core';
import { ArtusCliOptions } from './types';
import assert from 'node:assert';
import { BIN_OPTION_SYMBOL } from './constant';
import { readPkg, getCalleeDir } from './utils';
import { BinInfo, BinInfoOption } from './core/bin_info';
import path from 'node:path';

export * from '@artus/core';
export { Context } from '@artus/pipeline';
export * from './core/decorators';
export * from './core/program';
export * from './core/utils';
export * from './core/bin_info';
export * from './types';

export * from './core/command';
export * from './core/context';
export * from './core/parsed_commands';

export async function start(options: ArtusCliOptions = {}) {
  if (process.env.ARTUS_CLI_SCANNING) {
    // avoid scan bin file and start again
    return null;
  }

  // try to read baseDir by callee stack
  const findPkgDir = options.baseDir || getCalleeDir(2);
  assert(findPkgDir, 'Can not detect baseDir, failed to load package.json');

  const { pkgInfo, pkgPath } = await readPkg(findPkgDir);
  const baseDir = options.baseDir || path.dirname(pkgPath);

  // record scanning state
  process.env.ARTUS_CLI_SCANNING = 'true';

  // scan app files
  const scanner = new Scanner({
    needWriteFile: false,
    configDir: 'config',
    extensions: [ '.ts' ],
    framework: options.framework || { path: __dirname },
    exclude: options.exclude || [ 'bin', 'test', 'coverage' ],
  });

  const manifest = await scanner.scan(baseDir);
  delete process.env.ARTUS_CLI_SCANNING;

  // start app
  const artusEnv = options.artusEnv || process.env.ARTUS_CLI_ENV || 'default';
  const app = new ArtusApplication();
  assert(manifest[artusEnv], `Unknown env "${artusEnv}"`);

  // bin opt store in app
  app[BIN_OPTION_SYMBOL] = { ...options, pkgInfo, artusEnv, baseDir } satisfies BinInfoOption;
  await app.load(manifest[artusEnv], baseDir);
  await app.run();
  return app;
}
