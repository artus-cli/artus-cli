import 'reflect-metadata';
import { ArtusApplication, Scanner } from '@artus/core';
import { ApplicationOptions } from './types';
import path from 'path';

export * from '@artus/core';
export { Context } from '@artus/pipeline';
export * from './core/decorators';
export * from './core/program';
export * from './core/utils';
export * from './types';

export * from './core/command';
export * from './core/context';
export * from './core/parsed_commands';

export async function start(options: ApplicationOptions = {}) {
  if (process.env.ARTUS_CLI_SCANNING) {
    // avoid scan bin file and start again
    return null;
  }

  const baseDir = options.baseDir || process.cwd();

  // bin can be options.binName or pkg.name
  process.env.ARTUS_CLI_BIN = options.binName || require(`${baseDir}/package.json`).name;
  process.env.ARTUS_CLI_SCANNING = 'true';
  process.env.ARTUS_CLI_BASEDIR = baseDir;

  // scan app files
  const scanner = new Scanner({
    needWriteFile: false,
    configDir: 'config',
    extensions: [ '.ts' ],
    framework: options.framework || { path: __dirname },
  });

  const manifest = await scanner.scan(baseDir);
  delete process.env.ARTUS_CLI_SCANNING;

  // start app
  const env = options.env || process.env.ARTUS_CLI_ENV || 'default';
  const app = new ArtusApplication();
  await app.load(manifest[env], baseDir);
  await app.run();
  return app;
}
