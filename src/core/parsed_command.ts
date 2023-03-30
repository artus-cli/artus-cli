import { Middlewares } from '@artus/pipeline';
import { CommandConfig, OptionConfig, MiddlewareConfig, ExampleItem, OptionInjectMeta, OptionMeta } from '../types';
import { ParsedCommandStruct, Positional } from './parser';
import { Command, EmptyCommand } from './command';
const OPTION_SYMBOL = Symbol('ParsedCommand#Option');

export interface ParsedCommandOption {
  location?: string;
  commandConfig: FormattedCommandConfig;
  optionConfig?: Partial<OptionMeta> & {
    flagOptions: OptionConfig;
    argumentOptions: OptionConfig;
  };
}

export interface FormattedCommandConfig {
  enable: boolean;
  command: string;
  description: string;
  examples: ExampleItem[];
  alias: string[];
  parsedCommandInfo: ParsedCommandStruct;
  originalCommandConfig: CommandConfig;
}

/** Wrapper of command */
export class ParsedCommand implements ParsedCommandStruct {
  /** cmds.join(' ') */
  uid: string;
  /** the last element of cmds, 'bin dev' is 'dev', 'bin module test [baseDir]' is 'test' */
  cmd: string;
  /** convert command to array, like [ 'bin', 'dev' ] */
  cmds: string[];
  /** user defined in options but remove bin name */
  command: string;
  alias: string[];
  enable: boolean;
  demanded: Positional[];
  optional: Positional[];
  description: string;
  examples: ExampleItem[];
  globalOptions?: OptionConfig;
  injections: OptionInjectMeta[];
  flagOptions: OptionConfig;
  argumentOptions: OptionConfig;
  /** Command class location */
  location?: string;

  /** child commands */
  childs: ParsedCommand[];
  /** parent command */
  parent: ParsedCommand | null;
  /** inherit command */
  inherit: ParsedCommand | null;

  commandConfig: CommandConfig;
  commandMiddlewares: Middlewares;
  executionMiddlewares: Middlewares;

  constructor(public clz: typeof Command, option: ParsedCommandOption) {
    const { location, commandConfig, optionConfig } = option;
    const { parsedCommandInfo } = commandConfig;
    this.location = location;

    // read from parsed_command
    this.uid = parsedCommandInfo.uid;
    this.command = parsedCommandInfo.command;
    this.cmd = parsedCommandInfo.cmd;
    this.cmds = parsedCommandInfo.cmds;
    this.demanded = parsedCommandInfo.demanded;
    this.optional = parsedCommandInfo.optional;

    // read from option config
    this.injections = optionConfig?.injections || [];
    this.flagOptions = optionConfig?.flagOptions || {};
    this.argumentOptions = optionConfig?.argumentOptions || {};
    this.childs = [];
    this.parent = null;
    this.inherit = null;

    // read from command config
    this.commandConfig = commandConfig.originalCommandConfig;
    this.description = commandConfig.description;
    this.examples = commandConfig.examples;
    this.enable = commandConfig.enable;
    this.alias = commandConfig.alias;

    // middleware config
    this.commandMiddlewares = [];
    this.executionMiddlewares = [];
  }

  get options(): OptionConfig {
    if (!this[OPTION_SYMBOL]) {
      this[OPTION_SYMBOL] = { ...this.globalOptions, ...this.flagOptions };
    }
    return this[OPTION_SYMBOL];
  }

  get isRoot() {
    return !this.parent;
  }

  get isRunable() {
    return this.clz !== EmptyCommand && this.enable;
  }

  get depth() {
    return this.cmds.length;
  }

  addMiddlewares(type: 'command' | 'execution', config: MiddlewareConfig) {
    const { middleware, mergeType } = config;
    const middlewares = type === 'command' ? this.commandMiddlewares : this.executionMiddlewares;
    const extraMiddlewares = Array.isArray(middleware) ? middleware : [ middleware ];
    // mergeType default is after
    if (!mergeType || mergeType === 'after') {
      middlewares.push(...extraMiddlewares);
    } else {
      middlewares.unshift(...extraMiddlewares);
    }
  }

  updateGlobalOptions(opt: OptionConfig) {
    this.globalOptions = { ...this.globalOptions, ...opt };
    this[OPTION_SYMBOL] = null;
  }
}
