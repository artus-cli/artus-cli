import 'reflect-metadata';
import { ArtusApplication, Scanner } from '@artus/core';
import { dirname } from 'dirname-filename-esm';
import fs from 'node:fs/promises';
import path from 'node:path';
const __dirname = dirname(import.meta);

export * from '@artus/core';
export { Context } from '@artus/pipeline';
export * from './core/decorators.js';
export * from './core/program.js';
export * from './core/helper.js';
export * from './types.js';

export * from './proto/Command.js';
export * from './proto/CommandContext.js';
export * from './proto/ParsedCommands.js';

export interface ApplicationOptions {
  framework?: { package?: string; path?: string };
  baseDir?: string;
}

export interface CommonBinConfig {
  bin: string;
  baseDir: string;
}

export async function start(options ?: ApplicationOptions) {
  if (process.env.ARTUS_COMMON_BIN_SCANNING) {
    // avoid scan bin file and start again
    return null;
  }

  const baseDir = options.baseDir || process.cwd();
  const pkgInfo = JSON.parse(await fs.readFile(path.resolve(baseDir, 'package.json'), 'utf-8').catch(() => '{}'));
  process.env.ARTUS_COMMON_BIN_NAME = pkgInfo.name || 'bin';
  process.env.ARTUS_COMMON_BIN_SCANNING = 'true';
  process.env.ARTUS_COMMON_BIN_BASEDIR = baseDir;

  console.info(import.meta.url);
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
