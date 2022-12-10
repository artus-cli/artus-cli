import 'reflect-metadata';
import { ArtusApplication, Scanner } from '@artus/core';
import { ApplicationOptions } from './types';

export * from '@artus/core';
export { Context } from '@artus/pipeline';
export * from './core/decorators';
export * from './core/program';
export * from './core/utils';
export * from './types';

export * from './proto/Command';
export * from './proto/CommandContext';
export * from './proto/ParsedCommands';

export async function start(options ?: ApplicationOptions) {
  if (process.env.ARTUS_COMMON_BIN_SCANNING) {
    // avoid scan bin file and start again
    return null;
  }

  const baseDir = options.baseDir || process.cwd();
  process.env.ARTUS_COMMON_BIN_NAME = require(`${baseDir}/package.json`).name || 'bin';
  process.env.ARTUS_COMMON_BIN_SCANNING = 'true';
  process.env.ARTUS_COMMON_BIN_BASEDIR = baseDir;

  // scan app files
  const scanner = new Scanner({
    needWriteFile: false,
    configDir: 'config',
    extensions: [ '.ts' ],
    framework: options.framework || { path: __dirname },
  });

  const manifest = await scanner.scan(baseDir);
  delete process.env.ARTUS_COMMON_BIN_SCANNING;

  // start app
  const app = new ArtusApplication();
  await app.load(manifest.default, baseDir);
  await app.run();
  return app;
}
