import { debuglog } from 'node:util';
import assert from 'node:assert';
import { Injectable, Inject, ScopeEnum } from '@artus/core';
import { CommandMeta, CommandConfig, OptionMeta, OptionConfig, MiddlewareMeta } from '../types';
import { parseCommand } from './parser';
import { Command, EmptyCommand } from './command';
import { MetadataEnum } from '../constant';
import { isInheritFrom, formatToArray, formatCmd, formatDesc } from '../utils';
import { errors } from '../errors';
import { ParsedCommand, FormattedCommandConfig } from './parsed_command';
import { BinInfo } from './bin_info';
const debug = debuglog('artus-cli#ParsedCommands');

/** Parsed Command Tree */
@Injectable({ scope: ScopeEnum.SINGLETON })
export class ParsedCommandTree {
  @Inject()
  private readonly binInfo: BinInfo;

  /** root of command tree */
  root: ParsedCommand | undefined;

  /** command list, the key is command string used to match argv */
  commands: Map<string, ParsedCommand> = new Map();

  /** cache the instance of parsedCommand */
  parsedCommandMap: Map<typeof Command, ParsedCommand> = new Map();

  private get descObj() {
    return {
      ...this.binInfo,
      $0: this.binInfo.binName,
      bin: this.binInfo.binName,
    };
  }

  private formatOptions(option: OptionConfig, argumentsKey: string[]) {
    const descObj = this.descObj;
    const flagOptions: OptionConfig = {};
    const argumentOptions: OptionConfig = {};
    Object.keys(option).forEach(key => {
      const obj = argumentsKey.includes(key) ? argumentOptions : flagOptions;
      const config = obj[key] = { ...option[key] };
      if (config.description) {
        config.description = formatDesc(config.description, descObj);
      }
    });

    return {
      flagOptions, argumentOptions,
    };
  }

  private formatCommandConfig(config: CommandConfig, parent?: ParsedCommand): FormattedCommandConfig {
    const binName = this.binInfo.binName;
    const obj = this.descObj;

    const prefix = parent?.cmds.join(' ');
    const command = formatCmd(config.command || '', obj, prefix);
    const examples = formatToArray(config.examples).map(info => {
      const items = typeof info === 'string' ? [ info ] : info;
      return {
        command: formatCmd(items[0], obj, prefix),
        description: items[1] ? formatDesc(items[1], obj) : undefined,
      };
    });

    const parsedCommandInfo = parseCommand(command, binName);
    return {
      command,
      enable: typeof config.enable === 'boolean' ? config.enable : true,
      examples,
      alias: formatToArray(config.alias),
      description: formatDesc(config.description || '', obj),
      originalCommandConfig: config,
      parsedCommandInfo,
    };
  }

  /** convert Command class to ParsedCommand instance */
  private initParsedCommand(clz: typeof Command) {
    const metadata = Reflect.getOwnMetadata(MetadataEnum.COMMAND, clz) as CommandMeta;
    if (!metadata) return;

    // avoid creating parsedCommand again.
    if (this.parsedCommandMap.has(clz)) {
      return this.parsedCommandMap.get(clz);
    }

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

    // init parent
    let parentCommand: ParsedCommand | undefined;
    if (commandConfig.parent) {
      parentCommand = this.initParsedCommand(commandConfig.parent);
      assert(parentCommand, `parent ${commandConfig.parent?.name} is not a valid Command`);
    }

    // format command config
    const formattedCommandConfig = this.formatCommandConfig(commandConfig, parentCommand);
    const parsedCommandInfo = formattedCommandConfig.parsedCommandInfo;

    // split options with argument key and merge option info with inherit command
    const optionMeta: OptionMeta | undefined = Reflect.getOwnMetadata(MetadataEnum.OPTION, clz);
    const argumentsKey = parsedCommandInfo.demanded.concat(parsedCommandInfo.optional).map(pos => pos.cmd);
    let { flagOptions, argumentOptions } = this.formatOptions(optionMeta?.config || {}, argumentsKey);
    if (inheritCommand && optionMeta?.inheritMetadata !== false) {
      flagOptions = Object.assign({}, inheritCommand.flagOptions, flagOptions);
      argumentOptions = Object.assign({}, inheritCommand.argumentOptions, argumentOptions);
    }

    const parsedCommand = new ParsedCommand(clz, {
      location: commandMeta.location,
      commandConfig: formattedCommandConfig,
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

  public build(commandList: Array<typeof Command>) {
    this.root = undefined;
    this.commands.clear();
    this.parsedCommandMap.clear();

    const parsedCommands = commandList
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
              commandConfig: this.formatCommandConfig({ command: fullCmd }),
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
