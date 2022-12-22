import { Command } from './core/command';
import { Middleware, Middlewares } from '@artus/pipeline';

export interface CommandConfig extends Record<string, any> {
  /** a string representing the command */
  command?: string;
  /** command description */
  description?: string;
  /** command alias */
  alias?: string | string[];
  /** parent command */
  parent?: typeof Command;

  /** whether override exists command */
  ignoreConflict?: boolean;
}

/** Base Option Interface */
export interface Option {
  /** Non-option arguments */
  _: Array<string | number>;
  /** Arguments after the end-of-options flag `--` */
  '--'?: Array<string | number>;
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

/**
 * convert type to literal string , used in DefineOption
 * - string => 'string'
 * - number => 'number'
 * - boolean => 'boolean'
 */
export type ConvertTypeToBasicType<T> = (
  T extends string
    ? 'string' : (
      T extends number
        ? 'number'
        : (
          T extends boolean
            ? 'boolean'
            : BasicType
        )
    )
);

export interface OptionProps<T extends BasicType = BasicType, G = any> extends Record<string, any> {
  type?: T;
  alias?: string | string[];
  default?: G;
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
  location?: string;
}

export interface ArtusCliOptions extends Partial<ArtusCliConfig> {
  /** artus start env */
  artusEnv?: string;

  /** bin base dir, default is the same directory with package.json */
  baseDir?: string;

  /** framework option, default is artus-cli */
  framework?: { package?: string; path?: string };

  /** exclude scan dir */
  exclude?: string[];
}

export interface ArtusCliConfig {
  /** your bin name, default is name in package.json */
  binName?: string;

  /** strict mode in checking arguments and options, default is true */
  strict?: boolean;

  /** strict mode in checking options, default is `options.strict` */
  strictOptions?: boolean;

  /** strict mode in checking arguments, default is `options.strict` */
  strictCommands?: boolean;
}
