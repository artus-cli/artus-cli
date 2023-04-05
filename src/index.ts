import 'reflect-metadata';
import { ArtusApplication, Scanner } from '@artus/core';
import { ArtusCliOptions } from './types';
import assert from 'node:assert';
import { BIN_OPTION_SYMBOL } from './constant';
import { readPkg, getCalleeFile } from './utils';
import { BinInfoOption } from './core/bin_info';
import path from 'node:path';
import fs from 'fs';

export * from '@artus/core';
export { Context } from '@artus/pipeline';
export * from './core/decorators';
export * from './core/program';
export * from './core/utils';
export * from './core/bin_info';
export * from './errors';
export * from './types';

export * from './core/command';
export * from './core/context';
export * from './core/parsed_commands';
export * from './core/parsed_command';
export * from './core/parsed_command_tree';

export async function start(options: ArtusCliOptions = {}) {
  if (process.env.ARTUS_CLI_SCANNING) {
    // avoid scan bin file and start again
    return null;
  }

  // try to read baseDir by callee stack
  const calleeFile = getCalleeFile(2);
  const findPkgDir = options.baseDir || (calleeFile && path.dirname(calleeFile));
  assert(findPkgDir, 'Can not detect baseDir, failed to load package.json');

  const { pkgInfo, pkgPath } = await readPkg(findPkgDir);
  const baseDir = options.baseDir || path.dirname(pkgPath);

  // auto use package.json bin
  if (!options.binName && pkgInfo.bin && typeof pkgInfo.bin === 'object') {
    options.binName = Object.keys(pkgInfo.bin)[0];
  }

  let manifest: Record<string, any> | undefined;
  const manifestCachePath = path.resolve(baseDir, 'manifest.json');
  if (options.useManifestCache && fs.existsSync(manifestCachePath)) {
    try {
      manifest = require(manifestCachePath);
    } catch(e) {
      // do nothing
    }
  }

  if (!manifest) {
    // record scanning state
    process.env.ARTUS_CLI_SCANNING = 'true';

    const exclude = options.exclude || [ 'bin', 'test', 'coverage' ];
    if (calleeFile) {
      const isBuildJavascriptFile = calleeFile.endsWith('.js');
      if (isBuildJavascriptFile) {
        exclude.push('*.ts');
      } else {
        exclude.push('dist');
      }
    }

    // scan app files
    const scanner = new Scanner({
      needWriteFile: false,
      configDir: 'config',
      extensions: [ '.ts' ],
      framework: options.framework || { path: __dirname },
      exclude,
    });

    manifest = await scanner.scan(baseDir);

    // save manifest to local
    if (options.useManifestCache) {
      fs.writeFileSync(manifestCachePath, JSON.stringify(manifest));
    }

    delete process.env.ARTUS_CLI_SCANNING;
  }

  if (process.env.ARTUS_CLI_PRELOAD !== 'true') {
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

  return null;
}
