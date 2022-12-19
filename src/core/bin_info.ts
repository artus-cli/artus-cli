import { ScopeEnum, ArtusInjectEnum, ArtusApplication, Inject, Injectable } from '@artus/core';
import { ArtusCliConfig } from '../types';
import { BIN_OPTION_SYMBOL } from '../constant';

export interface BinInfoOption extends ArtusCliConfig {
  artusEnv: string;
  baseDir: string;
  pkgInfo: Record<string, any>;
}

@Injectable({ scope: ScopeEnum.SINGLETON })
export class BinInfo {
  name: string;
  version: string;
  /** artus env, default/dev/prod/... */
  artusEnv: string;
  /** bin name */
  binName: string;
  /** bin base dir */
  baseDir: string;
  /** author in package.json */
  author: any;
  /** description in package.json */
  description: string;
  /** pkg info */
  pkgInfo: Record<string, any>;
  strict: boolean;
  strictCommands: boolean;
  strictOptions: boolean;

  constructor(
    @Inject(ArtusInjectEnum.Application) app: ArtusApplication,
  ) {
    const opt: BinInfoOption = app[BIN_OPTION_SYMBOL];
    this.name = opt.pkgInfo.name || '';
    this.artusEnv = opt.artusEnv;
    this.version = opt.pkgInfo.version || '';
    // bin can be options.binName or pkg.name
    this.binName = opt.binName || app.config.binName || opt.pkgInfo.name;
    this.baseDir = opt.baseDir;
    this.author = opt.pkgInfo.author || '';
    this.description = opt.pkgInfo.description || '';
    this.pkgInfo = opt.pkgInfo;

    const getBool = (...args: any[]) => args.find(a => typeof a === 'boolean');
    this.strict = getBool(opt.strict, app.config.strict);
    this.strictCommands = getBool(opt.strictCommands, app.config.strictCommands, this.strict);
    this.strictOptions = getBool(opt.strictOptions, app.config.strictOptions, this.strict);
    delete app[BIN_OPTION_SYMBOL];
  }
}
