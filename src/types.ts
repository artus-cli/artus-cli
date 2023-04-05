import { Command } from './core/command';
import { Middleware, Middlewares } from '@artus/pipeline';
import { OptionInjectType } from './constant';

export interface CommandConfig extends Record<string, any> {
  /** whether enable command, default to true */
  enable?: boolean;
  /** a string representing the command */
  command?: string;
  /** command description */
  description?: string;
  /** command usage examples */
  examples?: Array<string | [ string ] | [ string, string ]>;
  /** command alias */
  alias?: string | string[];
  /** parent command */
  parent?: typeof Command;
}

/** Base Option Interface */
// export interface Option {
//   /** Non-option arguments */
//   _: Array<string | number>;
//   /** Arguments after the end-of-options flag `--` */
//   '--'?: Array<string | number>;
// }

export interface MiddlewareConfig {
  mergeType?: 'before' | 'after',
  middleware: MiddlewareInput;
}

export type MiddlewareInput = Middleware | Middlewares;

export interface MiddlewareMeta extends BaseMeta {
  /** middleware config list */
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
  array?: boolean;
  alias?: string | string[];
  default?: G;
  required?: boolean;
  description?: string;
}

export type OptionConfig<T extends string = string> = Record<T, OptionProps>;

export interface BaseMeta {
  /** whether inherit meta data from prototype, default to true */
  inheritMetadata?: boolean;
}

export interface OptionInjectMeta {
  type: OptionInjectType;
  propName: string;
}

export interface OptionMeta<T extends string = string> extends BaseMeta {
  /** option config */
  config: OptionConfig<T>;
  injections: OptionInjectMeta[];
}

export interface CommandMeta extends BaseMeta {
  /** command config */
  config: CommandConfig;
  /** Command Class location */
  location?: string;
  /** whether override exists conflict command */
  overrideCommand?: boolean;
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

  /** read/write cache manifest file in local */
  useManifestCache?: boolean;
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

export interface ExampleItem {
  command: string;
  description?: string;
}
