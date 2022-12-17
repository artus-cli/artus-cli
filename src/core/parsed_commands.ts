import { Command, EmptyCommand } from './command';
import { MetadataEnum } from '../constant';
import { CommandMeta, CommandConfig, OptionMeta, OptionConfig, MiddlewareConfig, MiddlewareMeta } from '../types';
import parser from 'yargs-parser';
import Debug from 'debug';
import pick from 'lodash.pick';
import omit from 'lodash.omit';
import { format } from 'node:util';
import { isInheritFrom, isNil, convertValue } from '../utils';
import { ArtusInjectEnum, Injectable, Container, Inject, ScopeEnum } from '@artus/core';
import { Middlewares } from '@artus/pipeline';
import { assert } from 'node:console';
const debug = Debug('artus-cli#ParsedCommands');
const OPTION_SYMBOL = Symbol('ParsedCommand#Option');

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
  error?: Error;
  /**
   * parsed args by argv
   */
  args: Record<string, any>;
}

export interface ParsedCommandStruct {
  uid: string;
  cmd: string;
  cmds: string[];
  command: string;
  demanded: Positional[];
  optional: Positional[];
}

export interface Positional {
  cmd: string;
  variadic: boolean;
}

export interface ParsedCommandOption {
  commandConfig: CommandConfig,
  parsedCommandInfo: ParsedCommandStruct;
  optionConfig?: {
    optionsKey?: string;
    flagOptions: OptionConfig;
    argumentOptions: OptionConfig;
  };
}

export function parseCommand(cmd: string, binName: string) {
  const extraSpacesStrippedCommand = cmd.replace(/\s{2,}/g, ' ');
  const splitCommand = extraSpacesStrippedCommand.split(/\s+(?![^[]*]|[^<]*>)/);
  const bregex = /\.*[\][<>]/g;
  if (!splitCommand.length) throw new Error(`No command found in: ${cmd}`);

  // first cmd is binName or $0, remove it anyway
  if ([ binName, '$0' ].includes(splitCommand[0])) {
    splitCommand.shift();
  }

  let command: string;
  let root = false;
  if (!splitCommand[0] || splitCommand[0].match(bregex)) {
    root = true;
    command = [ binName, ...splitCommand ].join(' ');
  } else {
    command = splitCommand.join(' ');
  }

  const parsedCommand: ParsedCommandStruct = {
    uid: '',
    cmd: '',
    cmds: [ binName ],
    command,
    demanded: [],
    optional: [],
  };

  splitCommand.forEach((cmd, i) => {
    let variadic = false;
    cmd = cmd.replace(/\s/g, '');

    // <file...> or [file...]
    if (/\.+[\]>]/.test(cmd) && i === splitCommand.length - 1) variadic = true;

    const result = cmd.match(/^(\[|\<)/);
    if (result) {
      if (result[1] === '[') {
        // [options]
        parsedCommand.optional.push({ cmd: cmd.replace(bregex, ''), variadic });
      } else {
        // <options>
        parsedCommand.demanded.push({ cmd: cmd.replace(bregex, ''), variadic });
      }
    } else {
      // command without [] or <>
      parsedCommand.cmds.push(cmd);
    }
  });

  // last cmd is the command
  parsedCommand.cmd = parsedCommand.cmds[parsedCommand.cmds.length - 1];
  parsedCommand.uid = parsedCommand.cmds.join(' ');
  return parsedCommand;
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
  override?: boolean;
  demanded: Positional[];
  optional: Positional[];
  description: string;
  globalOptions?: OptionConfig;
  flagOptions: OptionConfig;
  argumentOptions: OptionConfig;
  optionsKey?: string;
  childs: ParsedCommand[];
  parent: ParsedCommand | null;

  commandConfig: CommandConfig;
  commandMiddlewares: Middlewares;
  executionMiddlewares: Middlewares;

  constructor(public clz: typeof Command, option: ParsedCommandOption) {
    const { commandConfig, parsedCommandInfo, optionConfig } = option;

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
    this.optionsKey = optionConfig?.optionsKey;
    this.childs = [];
    this.parent = null;

    // read from command config
    this.commandConfig = commandConfig;
    this.override = commandConfig.override;
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

  get options() {
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
    if (inheritCommand && !commandMeta?.override) {
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
    const flagOptions: OptionConfig = omit(optionMeta?.config || {}, argumentsKey);
    const argumentOptions: OptionConfig = pick(optionMeta?.config || {}, argumentsKey);
    if (inheritCommand && !optionMeta?.override) {
      Object.assign(flagOptions, inheritCommand.flagOptions);
      Object.assign(argumentOptions, inheritCommand.argumentOptions);
    }

    const parsedCommand = new ParsedCommand(clz, {
      commandConfig,
      parsedCommandInfo,
      optionConfig: { flagOptions, argumentOptions, optionsKey: optionMeta?.key },
    });

    if (this.commands.has(parsedCommandInfo.uid)) {
      const existsParsedCommand = this.commands.get(parsedCommandInfo.uid)!;

      // override only allow in class inheritance or options.override=true
      const errorInfo = format('Command \'%s\' provide by %s is overrided by %s', existsParsedCommand.command, existsParsedCommand.clz.name, parsedCommand.clz.name);
      if (!parsedCommand.override && !isInheritFrom(parsedCommand.clz, existsParsedCommand.clz)) {
        throw new Error(errorInfo);
      }

      debug(errorInfo);
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
    const middlewareConfig = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, clz) as (MiddlewareMeta | undefined);
    const commandMiddlewareConfigList = middlewareConfig?.configList || [];
    if (inheritCommand && !optionMeta?.override) {
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
  private binName: string;
  private tree: ParsedCommandTree;

  constructor(
    @Inject() container: Container,
    @Inject(ArtusInjectEnum.Config) config: any,
  ) {
    const commandList = container.getInjectableByTag(MetadataEnum.COMMAND);
    // bin name, default is pkg.name
    this.binName = config.binName;
    this.tree = new ParsedCommandTree(this.binName, commandList);
  }

  get root() {
    return this.tree.root;
  }

  get commands() {
    return this.tree.commands;
  }

  /** check `<options>` or `[option]` and collect args */
  private checkPositional(args: string[], pos: Positional[], options: OptionConfig) {
    let nextIndex = pos.length;
    const result: Record<string, any> = {};
    const pass = pos.every((positional, index) => {
      // `bin <files..>` match `bin file1 file2 file3` => { files: [ "file1", "file2", "file3" ] }
      // `bin <file> [baseDir]` match `bin file1 ./` => { file: "file1", baseDir: "./" }
      let r;
      if (positional.variadic) {
        r = args.slice(index);
        nextIndex = args.length; // variadic means the last
      } else {
        r = args[index];
      }

      // check arguments option
      const argOpt = options[positional.cmd];
      if (argOpt) {
        r = isNil(r) ? argOpt.default : r;
        if (argOpt.type) r = convertValue(r, argOpt.type);
      }

      result[positional.cmd] = r;
      return !!r;
    });

    return {
      result,
      pass,
      args: args.slice(nextIndex),
    };
  }

  /** match command by argv */
  private _matchCommand(argv: string | string[]) {
    const result: MatchResult & { positionalArgs: Record<string, any> } = {
      fuzzyMatched: this.root,
      args: this.parseArgs(argv),

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

    debug('Fuzzy match result is %s', result.fuzzyMatched?.clz.name);

    // 2. match demanded( <options> or <options...> ) and optional( [options] or [options...] ) info
    let extraArgs = wholeArgv.slice(index);
    if (result.fuzzyMatched) {
      const fuzzyMatched = result.fuzzyMatched;
      if (fuzzyMatched.demanded.length) {
        const checkDemanded = this.checkPositional(extraArgs, fuzzyMatched.demanded, fuzzyMatched.argumentOptions);
        if (!checkDemanded.pass) {
          // demanded not match
          debug('Demaned is not match with %s', extraArgs);
          result.error = new Error('Not enough arguments');
          return result;
        }

        // pick args from demanded info
        Object.assign(result.positionalArgs, checkDemanded.result);
        extraArgs = checkDemanded.args;
      }

      if (fuzzyMatched.optional.length) {
        const checkOptional = this.checkPositional(extraArgs, fuzzyMatched.optional, fuzzyMatched.argumentOptions);
        Object.assign(result.positionalArgs, checkOptional.result);
        extraArgs = checkOptional.args;
      }

      // unknown args
      if (extraArgs.length) {
        debug('Unknown arguments %s', extraArgs);
        result.error = new Error(format('Unknown arguments %s', extraArgs));
        return result;
      }

      if (fuzzyMatched.isRunable) {
        // all pass
        result.matched = result.fuzzyMatched;

        debug('Final match result is %s', result.matched.clz.name);
        return result;
      } else {
        debug('Command is not implement');
      }
    }

    result.error = new Error('Command not found');
    return result;
  }

  /** parse argv with yargs-parser */
  parseArgs(argv: string | string[], parseCommand?: ParsedCommand) {
    const requiredOptions: string[] = [];
    const parserOption: parser.Options = {};
    if (parseCommand) {
      for (const key in parseCommand.options) {
        const opt = parseCommand.options[key];
        if (opt.required) requiredOptions.push(key);
        if (opt.alias !== undefined) {
          parserOption.alias = parserOption.alias || {};
          parserOption.alias[key] = opt.alias;
        }

        if (opt.type !== undefined) {
          parserOption[opt.type] = parserOption[opt.type] || [];
          parserOption[opt.type].push(key);
        }

        if (opt.default !== undefined) {
          parserOption.default = parserOption.default || {};
          parserOption.default[key] = opt.default;
        }
      }
    }

    const result = parser(argv, parserOption);
    const requiredNilOptions = requiredOptions.filter(k => isNil(result[k]));
    if (requiredNilOptions.length) {
      throw new Error(format('Required options: %s', requiredNilOptions.join(', ')));
    }

    return result;
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
