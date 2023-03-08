import { debuglog } from 'node:util';
import { assert } from 'node:console';

import { pick, omit } from 'lodash';
import { Injectable, Container, Inject, ScopeEnum } from '@artus/core';
import { Middlewares } from '@artus/pipeline';

import { CommandMeta, CommandConfig, OptionMeta, OptionConfig, MiddlewareConfig, MiddlewareMeta } from '../types';
import { ParseArgvOptions, parseArgvToArgs, parseArgvWithPositional, parseCommand, ParsedCommandStruct, Positional } from './parser';
import { Command, EmptyCommand } from './command';
import { MetadataEnum } from '../constant';
import { BinInfo } from './bin_info';
import { isInheritFrom } from '../utils';
import { errors, ArtusCliError } from '../errors';

const OPTION_SYMBOL = Symbol('ParsedCommand#Option');
const TREE_SYMBOL = Symbol('ParsedCommand#Tree');
const debug = debuglog('artus-cli#ParsedCommands');

export interface MatchResult {
  /**
   * total matched command
   */
  matched?: ParsedCommand;
  /**
   * fuzzy matched command
   */
  fuzzyMatched: ParsedCommand;
  /**
   * match error
   */
  error?: ArtusCliError;
  /**
   * parsed args by argv
   */
  args: Record<string, any>;
}

export interface ParsedCommandOption {
  location?: string;
  commandConfig: CommandConfig;
  parsedCommandInfo: ParsedCommandStruct;
  optionConfig?: {
    flagOptions: OptionConfig;
    argumentOptions: OptionConfig;
  };
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
  demanded: Positional[];
  optional: Positional[];
  description: string;
  globalOptions?: OptionConfig;
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
    const { location, commandConfig, parsedCommandInfo, optionConfig } = option;
    this.location = location;

    // read from parsed_command
    this.uid = parsedCommandInfo.uid;
    this.command = parsedCommandInfo.command;
    this.cmd = parsedCommandInfo.cmd;
    this.cmds = parsedCommandInfo.cmds;
    this.demanded = parsedCommandInfo.demanded;
    this.optional = parsedCommandInfo.optional;

    // read from option config
    this.flagOptions = optionConfig?.flagOptions || {};
    this.argumentOptions = optionConfig?.argumentOptions || {};
    this.childs = [];
    this.parent = null;
    this.inherit = null;

    // read from command config
    this.commandConfig = commandConfig;
    this.description = commandConfig.description || '';
    this.alias = commandConfig.alias
      ? Array.isArray(commandConfig.alias)
        ? commandConfig.alias
        : [ commandConfig.alias ]
      : [];

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
    return this.clz !== EmptyCommand;
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

/** Parsed Command Tree */
export class ParsedCommandTree {
  /** root of command tree */
  root: ParsedCommand;

  /** command list, the key is command string used to match argv */
  commands: Map<string, ParsedCommand>;

  /** cache the instance of parsedCommand */
  parsedCommandMap: Map<typeof Command, ParsedCommand>;

  constructor(
    private binName: string,
    private commandList: (typeof Command)[],
  ) {
    this.build();
  }

  /** convert Command class to ParsedCommand instance */
  private initParsedCommand(clz: typeof Command) {
    const metadata = Reflect.getOwnMetadata(MetadataEnum.COMMAND, clz) as CommandMeta;
    if (!metadata) return null;

    const commandMeta = metadata;
    const inheritClass = Object.getPrototypeOf(clz);
    const inheritCommand = this.initParsedCommand(inheritClass);

    let commandConfig = { ...commandMeta.config };

    // mege command config with inherit command
    if (inheritCommand && commandMeta.inheritMetadata !== false) {
      const inheritCommandConfig = inheritCommand.commandConfig;
      commandConfig = Object.assign({}, {
        alias: inheritCommandConfig.alias,
        command: inheritCommandConfig.command,
        description: inheritCommandConfig.description,
        parent: inheritCommandConfig.parent,
      } satisfies CommandConfig, commandConfig);
    }

    // default command is main command
    commandConfig.command = commandConfig.command || '$0';

    // init parent
    let command = commandConfig.command!;
    if (commandConfig.parent) {
      const parentParsedCommand = this.initParsedCommand(commandConfig.parent);
      assert(parentParsedCommand, `parent ${commandConfig.parent?.name} is not a valid Command`);
      command = parentParsedCommand!.cmds.concat(command).join(' ');
    }

    // avoid creating parsedCommand again.
    if (this.parsedCommandMap.has(clz)) {
      return this.parsedCommandMap.get(clz);
    }

    // parse command usage
    const parsedCommandInfo = parseCommand(command, this.binName);

    // split options with argument key and merge option info with inherit command
    const optionMeta: OptionMeta | undefined = Reflect.getOwnMetadata(MetadataEnum.OPTION, clz);
    const argumentsKey = parsedCommandInfo.demanded.concat(parsedCommandInfo.optional).map(pos => pos.cmd);
    let flagOptions: OptionConfig = omit(optionMeta?.config || {}, argumentsKey);
    let argumentOptions: OptionConfig = pick(optionMeta?.config || {}, argumentsKey);
    if (inheritCommand && optionMeta?.inheritMetadata !== false) {
      flagOptions = Object.assign({}, inheritCommand.flagOptions, flagOptions);
      argumentOptions = Object.assign({}, inheritCommand.argumentOptions, argumentOptions);
    }

    const parsedCommand = new ParsedCommand(clz, {
      location: commandMeta.location,
      commandConfig,
      parsedCommandInfo,
      optionConfig: { flagOptions, argumentOptions },
    });

    if (inheritCommand) parsedCommand.inherit = inheritCommand;
    if (this.commands.has(parsedCommandInfo.uid)) {
      const existsParsedCommand = this.commands.get(parsedCommandInfo.uid)!;

      // override only allow in class inheritance or options.override=true
      const err = errors.command_is_conflict(existsParsedCommand.command, existsParsedCommand.clz.name, existsParsedCommand.location, parsedCommand.clz.name, parsedCommand.location);
      if (!commandMeta.overrideCommand && !isInheritFrom(parsedCommand.clz, existsParsedCommand.clz)) {
        throw err;
      }

      debug(err.message);
    }

    // handle middlewares
    // Default orders:
    //
    // In class inheritance:
    //              command1  <-extend-  command2
    // trigger --> middleware1   -->   middleware2 --> middleware3  --> run
    //
    // ------------
    //
    // In run method:
    //                      command2                               command1
    // trigger --> middleware2 --> middleware3 --> run --> middleware1 --> super.run

    // merge command middlewares with inherit command
    const middlewareMeta = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, clz) as (MiddlewareMeta | undefined);
    const commandMiddlewareConfigList = middlewareMeta?.configList || [];
    if (inheritCommand && middlewareMeta?.inheritMetadata !== false) {
      parsedCommand.addMiddlewares('command', { middleware: inheritCommand.commandMiddlewares });
    }
    commandMiddlewareConfigList.forEach(config => parsedCommand.addMiddlewares('command', config));

    // add run middlewares, no need to merge with inherit command
    const executionMiddlewareConfig = Reflect.getOwnMetadata(MetadataEnum.RUN_MIDDLEWARE, clz) as (MiddlewareMeta | undefined);
    const executionMiddlewareConfigList = executionMiddlewareConfig?.configList || [];
    executionMiddlewareConfigList.forEach(config => parsedCommand.addMiddlewares('execution', config));

    // cache the instance
    this.commands.set(parsedCommandInfo.uid, parsedCommand);
    this.parsedCommandMap.set(clz, parsedCommand);
    return parsedCommand;
  }

  private build() {
    this.commands = new Map();
    this.parsedCommandMap = new Map();
    const parsedCommands = this.commandList
      .map(clz => this.initParsedCommand(clz))
      .filter(c => !!c) as ParsedCommand[];

    // handle parent and childs
    parsedCommands
      .sort((a, b) => a.depth - b.depth)
      .forEach(parsedCommand => {
        let parent: ParsedCommand | undefined;
        parsedCommand.cmds.forEach(cmd => {
          // fullCmd is the key of this.commands
          const fullCmd = parent ? parent.cmds.concat(cmd).join(' ') : cmd;

          let cacheParsedCommand = this.commands.get(fullCmd);
          if (!cacheParsedCommand) {
            // create empty node
            debug('Create empty command for \'%s\'', fullCmd);
            cacheParsedCommand = new ParsedCommand(EmptyCommand, {
              commandConfig: {},
              parsedCommandInfo: parseCommand(fullCmd, this.binName),
            });
            this.commands.set(fullCmd, cacheParsedCommand);
          }

          if (!parent) {
            this.root = parent = cacheParsedCommand;
            return;
          }

          cacheParsedCommand.parent = parent;
          parent.childs.push(cacheParsedCommand);
          parent = cacheParsedCommand;
        });
      });
  }

  get(clz: typeof Command) {
    return this.parsedCommandMap.get(clz);
  }
}

@Injectable({ scope: ScopeEnum.SINGLETON })
export class ParsedCommands {
  @Inject()
  private readonly container: Container;

  @Inject()
  private readonly binInfo: BinInfo;

  // parse command tree lazily
  get tree(): ParsedCommandTree {
    if (!this[TREE_SYMBOL]) {
      const commandList = this.container.getInjectableByTag(MetadataEnum.COMMAND);
      this[TREE_SYMBOL] = new ParsedCommandTree(this.binInfo.binName, commandList);
    }
    return this[TREE_SYMBOL];
  }

  get root() {
    return this.tree.root;
  }

  get commands() {
    return this.tree.commands;
  }

  /** match command by argv */
  private _matchCommand(argv: string | string[]) {
    const result: MatchResult & { positionalArgs: Record<string, any> } = {
      fuzzyMatched: this.root,
      args: this.parseArgs(argv, this.root, { validateArgv: false }),

      // parsed positional result;
      positionalArgs: {},
    };

    // argv without options/demanded/optional info
    const wholeArgv = result.args._;
    debug('Start fuzzy match with %s', wholeArgv);

    // 1. try to match command without checking demanded and optional.
    let index = 0;
    for (; index < wholeArgv.length; index++) {
      const el = wholeArgv[index];
      const nextMatch = result.fuzzyMatched.childs.find(c => (
        c.cmd === el || c.alias.includes(el)
      ));

      if (nextMatch) {
        result.fuzzyMatched = nextMatch;
        continue;
      }

      break;
    }

    debug('Fuzzy match result is %s', result.fuzzyMatched.clz.name);

    // 2. match demanded( <options> or <options...> ) and optional( [options] or [options...] ) info
    let extraArgs = wholeArgv.slice(index);
    const fuzzyMatched = result.fuzzyMatched;
    if (fuzzyMatched.demanded.length) {
      const parsedDemanded = parseArgvWithPositional(extraArgs, fuzzyMatched.demanded, fuzzyMatched.argumentOptions);
      if (parsedDemanded.unmatchPositionals.length && this.binInfo.strictOptions) {
        // demanded not match
        debug('Demaned positional is not match with extra argv %s', extraArgs);
        result.error = errors.not_enough_argumnents(parsedDemanded.unmatchPositionals.map(p => p.cmd));
        return result;
      }

      // pick args from demanded info
      Object.assign(result.positionalArgs, parsedDemanded.result);
      extraArgs = parsedDemanded.unknownArgv;
    }

    if (fuzzyMatched.optional.length) {
      const parsedOptional = parseArgvWithPositional(extraArgs, fuzzyMatched.optional, fuzzyMatched.argumentOptions);
      Object.assign(result.positionalArgs, parsedOptional.result);
      extraArgs = parsedOptional.unknownArgv;
    }

    // argv info in error
    const printArgv = Array.isArray(argv) ? argv.join(' ') : argv;

    // unknown commands, checking in strict mode
    if (extraArgs.length && this.binInfo.strictCommands) {
      result.error = errors.command_is_not_found(`${this.binInfo.binName}${printArgv ? ` ${printArgv}` : ''}`);
      debug(result.error.message);
      return result;
    }

    // all pass
    result.matched = result.fuzzyMatched;
    debug('Final match result is %s', result.matched.clz.name);

    // match empty command
    if (!result.matched.isRunable && this.binInfo.strictCommands) {
      result.error = errors.command_is_not_implement(`${this.binInfo.binName}${printArgv ? ` ${printArgv}` : ''}`);
      debug(result.error.message);
    }

    return result;
  }

  /** parse argv with yargs-parser */
  parseArgs(argv: string | string[], parseCommand?: ParsedCommand, parseOption?: ParseArgvOptions) {
    const result = parseArgvToArgs(argv, {
      optionConfig: parseCommand?.options,
      strictOptions: this.binInfo.strictOptions,
      ...parseOption,
    });

    return result.argv;
  }

  /** match command by argv */
  matchCommand(argv: string | string[]): MatchResult {
    let newArgs;

    const result = this._matchCommand(argv);
    if (result.matched) {
      try {
        // parse again with parserOption
        newArgs = this.parseArgs(argv, result.matched);
      } catch (e) {
        result.error = e;
      }
    }

    // merge args and positional args
    result.args = Object.assign(newArgs || result.args, result.positionalArgs);
    return result;
  }

  /** get parsed command by command */
  getCommand(clz: typeof Command) {
    return this.tree.get(clz);
  }
}
