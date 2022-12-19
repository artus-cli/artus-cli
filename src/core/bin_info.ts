import { ScopeEnum, ArtusInjectEnum, ArtusApplication, Inject, Injectable } from '@artus/core';
import { ArtusCliConfig } from '../types';
import { BIN_OPTION_SYMBOL } from '../constant';

export interface BinInfoOption {
  env: string;
  baseDir: string;
  pkgInfo: Record<string, any>;
  binName?: string;
  strict?: boolean;
  strictCommands?: boolean;
  strictOptions?: boolean;
}

@Injectable({ scope: ScopeEnum.SINGLETON })
export class BinInfo {
  name: string;
  version: string;
  env: string;
  binName: string;
  baseDir: string;
  author: string;
  description: string;
  pkgInfo: Record<string, any>;
  strict: boolean;
  strictCommands: boolean;
  strictOptions: boolean;

  @Inject(ArtusInjectEnum.Config)
  private config: ArtusCliConfig;

  constructor(
    @Inject(ArtusInjectEnum.Application) app: ArtusApplication,
  ) {
    const opt: BinInfoOption = app[BIN_OPTION_SYMBOL];
    this.name = opt.pkgInfo.name || '';
    this.env = opt.env;
    this.version = opt.pkgInfo.version || '';
    // bin can be options.binName or pkg.name
    this.binName = opt.binName || app.config.binName || opt.pkgInfo.name;
    this.baseDir = opt.baseDir;
    this.author = opt.pkgInfo.author || '';
    this.description = opt.pkgInfo.description || '';
    this.pkgInfo = opt.pkgInfo;

    this.strict = typeof opt.strict === 'boolean' ? opt.strict : app.config.strict!;
    this.strictCommands = typeof opt.strictCommands === 'boolean'
      ? opt.strictCommands
      : (typeof app.config.strictCommands === 'boolean' ? app.config.strictCommands : this.strict);
    this.strictOptions = typeof opt.strictOptions === 'boolean'
      ? opt.strictOptions
      : (typeof app.config.strictOptions === 'boolean' ? app.config.strictOptions : this.strict);
    delete app[BIN_OPTION_SYMBOL];
  }
}
