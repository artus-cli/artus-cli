import { Command } from './core/command';
import { Middleware, Middlewares } from '@artus/pipeline';

export interface CommandConfig extends Record<string, any> {
  command?: string;
  description?: string;
  alias?: string | string[];
  override?: boolean;
  parent?: typeof Command;
}

export interface MiddlewareConfig {
  mergeType?: 'before' | 'after',
  middleware: MiddlewareInput;
}

export type MiddlewareInput = Middleware | Middlewares;

export interface MiddlewareMeta {
  override?: boolean;
  configList: MiddlewareConfig[];
}

export type BasicType = 'string' | 'number' | 'boolean';
export interface OptionProps extends Record<string, any> {
  type?: BasicType;
  alias?: string | string[];
  default?: any;
  required?: boolean;
  description?: string;
}

export type OptionConfig<T extends string = string> = Record<T, OptionProps>;

export interface OptionMeta<T extends string = string> {
  key: string;
  config: OptionConfig<T>;
  override?: boolean;
}

export interface CommandMeta {
  // nothing
  config: CommandConfig;
  override?: boolean;
}

export interface ApplicationOptions {
  /** start env */
  env?: string;
  /** your bin name, default is name in package.json */
  binName?: string;
  framework?: { package?: string; path?: string };
  baseDir?: string;
}

export interface CommonBinConfig {
  binName: string;
  baseDir: string;
}

export interface CommonBinInfo {
  name: string;
  version?: string;
  binName: string;
  baseDir: string;
  author?: string;
  description?: string;
  pkgInfo?: Record<string, any>;
}
