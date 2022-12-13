import { Command } from './core/command';

export interface CommandProps extends Record<string, any> {
  command?: string;
  description?: string;
  alias?: string | string[];
  override?: boolean;
  parent?: typeof Command;
}

export type BasicType = 'string' | 'number' | 'boolean';
export interface OptionProps extends Record<string, any> {
  type?: BasicType;
  alias?: string | string[];
  default?: any;
  required?: boolean;
  description?: string;
}

export interface OptionMeta<T extends string = string> {
  key: string;
  meta: Record<T, OptionProps>;
}

export interface CommandMeta extends CommandProps {
  // nothing
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
