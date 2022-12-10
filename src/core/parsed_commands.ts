import { Command, EmptyCommand } from './command';
import { MetadataEnum } from '../constant';
import { CommandMeta, OptionProps } from '../types';
import parser from 'yargs-parser';
import Debug from 'debug';
import { format } from 'node:util';
import { isInheritFrom, isNil } from '../utils';
import { ArtusInjectEnum, Injectable, Container, Inject, ScopeEnum } from '@artus/core';
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
  fuzzyMatched?: ParsedCommand;
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
  globalOptions?: Record<string, OptionProps>;
  baseOptions: Record<string, OptionProps>;
  optionsKey: string;
  childs: ParsedCommand[];
  parent: ParsedCommand;

  constructor(public clz: typeof Command, opt: ParsedCommandStruct & CommandMeta) {
    this.uid = opt.uid;
    this.command = opt.command;
    this.cmd = opt.cmd;
    this.cmds = opt.cmds;
    this.demanded = opt.demanded;
    this.optional = opt.optional;
    this.override = opt.override;
    const { key, meta } = Reflect.getMetadata(MetadataEnum.OPTION, clz) || {};
    this.baseOptions = meta;
    this.optionsKey = key;
    this.childs = [];
    this.parent = null;
    this.description = opt.description || '';
    this.alias = opt.alias
      ? Array.isArray(opt.alias)
        ? opt.alias
        : [ opt.alias ]
      : [];
  }

  get options() {
    if (!this[OPTION_SYMBOL]) {
      this[OPTION_SYMBOL] = { ...this.globalOptions, ...this.baseOptions };
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

  updateOptions(opt: Record<string, OptionProps>) {
    this.baseOptions = { ...this.options, ...opt };
    this[OPTION_SYMBOL] = null;
  }

  updateGlobalOptions(opt: Record<string, OptionProps>) {
    this.globalOptions = { ...this.globalOptions, ...opt };
    this[OPTION_SYMBOL] = null;
  }
}

@Injectable({ scope: ScopeEnum.SINGLETON })
export class ParsedCommands {
  private binName: string;

  /** cache the instance of parsedCommand */
  private parsedCommandMap: Map<typeof Command, ParsedCommand>;

  /** root of command tree */
  root: ParsedCommand;

  /** command list, the key is command string used to match argv */
  commands: Map<string, ParsedCommand>;

  constructor(
    @Inject() container: Container,
    @Inject(ArtusInjectEnum.Config) config: any,
  ) {
    const commandList = container.getInjectableByTag(MetadataEnum.COMMAND);
    // bin name, default is pkg.name
    this.binName = config.binName;
    this.buildCommandTree(commandList);
  }

  /** build command class to tree */
  private buildCommandTree(commandList: Array<typeof Command>) {
    this.commands = new Map();
    this.parsedCommandMap = new Map();
    const initCommandClz = clz => {
      const props: CommandMeta = Reflect.getMetadata(MetadataEnum.COMMAND, clz);

      let command = props.command;
      if (props.parent) {
        const parentParsedCommand = initCommandClz(props.parent);
        command = parentParsedCommand.cmds.concat(command).join(' ');
      }

      const info = parseCommand(command, this.binName);
      if (this.parsedCommandMap.has(clz)) {
        // avoid creating parsedCommand again.
        return this.parsedCommandMap.get(clz);
      }

      const parsedCommand = new ParsedCommand(clz, { ...props, ...info });
      if (this.commands.has(info.uid)) {
        const existsParsedCommand = this.commands.get(info.uid);

        // override only allow in class inheritance or options.override=true
        const errorInfo = format('Command \'%s\' provide by %s is overrided by %s', existsParsedCommand.command, existsParsedCommand.clz.name, parsedCommand.clz.name);
        if (!parsedCommand.override && !isInheritFrom(parsedCommand.clz, existsParsedCommand.clz)) {
          throw new Error(errorInfo);
        }

        debug(errorInfo);
      }

      this.commands.set(info.uid, parsedCommand);
      this.parsedCommandMap.set(clz, parsedCommand);
      return parsedCommand;
    };

    const parsedCommands = commandList.map(initCommandClz);

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
            cacheParsedCommand = new ParsedCommand(EmptyCommand, parseCommand(fullCmd, this.binName));
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

  /** check `<options>` or `[option]` and collect args */
  private checkPositional(args: string[], pos: Positional[]) {
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
  private _matchCommand(argv: string[]) {
    const result: MatchResult = {
      fuzzyMatched: this.root,
      args: this.parseArgs(argv),
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
        const checkDemanded = this.checkPositional(extraArgs, fuzzyMatched.demanded);
        if (!checkDemanded.pass) {
          // demanded not match
          debug('Demaned is not match with %s', extraArgs);
          result.error = new Error('Not enough arguments');
          return result;
        }

        // pick args from demanded info
        Object.assign(result.args, checkDemanded.result);
        extraArgs = checkDemanded.args;
      }

      if (fuzzyMatched.optional.length) {
        const checkOptional = this.checkPositional(extraArgs, fuzzyMatched.optional);
        Object.assign(result.args, checkOptional.result);
        extraArgs = checkOptional.args;
      }

      // unknown args
      if (extraArgs.length) {
        debug('Unknown arguments %s', extraArgs);
        result.error = new Error(format('Unknown arguments %s', extraArgs));
        return result;
      }

      // all pass
      result.matched = result.fuzzyMatched;

      debug('Final match result is %s', result.matched.clz.name);
      return result;
    }

    result.error = new Error('Command not found');
    return result;
  }

  /** parse argv with yargs-parser */
  parseArgs(argv: string[], parseCommand?: ParsedCommand) {
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
  matchCommand(argv: string[]) {
    const result = this._matchCommand(argv);
    if (result.matched) {
      try {
        // parse again with parserOption
        Object.assign(result.args, this.parseArgs(argv, result.matched));
      } catch (e) {
        result.error = e;
      }
    }

    return result;
  }

  /** get parsed command by command */
  getCommand(clz: typeof Command) {
    return this.parsedCommandMap.get(clz);
  }
}
