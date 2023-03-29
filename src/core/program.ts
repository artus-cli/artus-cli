/**
 * open api for user
 **/

import { Inject, Injectable, ScopeEnum } from '@artus/core';
import { CommandTrigger } from './trigger';
import { OptionProps, MiddlewareInput, MiddlewareConfig } from '../types';
import { Command } from './command';
import { BinInfo } from './bin_info';
import { ParsedCommands } from './parsed_commands';
import { ParsedCommand } from './parsed_command';

type MaybeParsedCommand = (typeof Command) | ParsedCommand;

@Injectable({ scope: ScopeEnum.SINGLETON })
export class Program {
  @Inject()
  private readonly trigger: CommandTrigger;

  @Inject()
  private readonly parsedCommands: ParsedCommands;

  /** bin info, including pkgInfo and config */
  @Inject()
  binInfo: BinInfo;

  /** all commands map */
  get commands() {
    return this.parsedCommands.commands;
  }

  /** root of command tree */
  get rootCommand() {
    return this.parsedCommands.root;
  }

  /** the bin name */
  get binName() {
    return this.binInfo.binName;
  }

  /** package name */
  get name() {
    return this.binInfo.name;
  }

  /** package version */
  get version() {
    return this.binInfo.version;
  }

  /** bin base dir */
  get baseDir() {
    return this.binInfo.baseDir;
  }

  private getParsedCommand(clz: MaybeParsedCommand) {
    return clz instanceof ParsedCommand ? clz : this.parsedCommands.getCommand(clz);
  }

  /** add options, works in all command by default */
  option(opt: Record<string, OptionProps>, effectCommands?: MaybeParsedCommand[]) {
    effectCommands = effectCommands || Array.from(this.commands.values());
    effectCommands.forEach(c => this.getParsedCommand(c)?.updateGlobalOptions(opt));
  }

  /** disable command dynamically */
  disableCommand(clz: MaybeParsedCommand) {
    const parsedCommand = this.getParsedCommand(clz);
    if (parsedCommand) parsedCommand.enable = false;
  }

  /** enable command dynamically */
  enableCommand(clz: MaybeParsedCommand) {
    const parsedCommand = this.getParsedCommand(clz);
    if (parsedCommand) parsedCommand.enable = true;
  }

  /** register pipeline middleware */
  use(fn: MiddlewareInput) {
    return this.trigger.use(fn);
  }

  /** register middleware in command */
  useInCommand(clz: MaybeParsedCommand, fn: MiddlewareInput, opt?: Pick<MiddlewareConfig, 'mergeType'>) {
    const parsedCommand = this.getParsedCommand(clz);
    if (parsedCommand) parsedCommand.addMiddlewares('command', { ...opt, middleware: fn });
  }

  /** register middleware in command.run */
  useInExecution(clz: MaybeParsedCommand, fn: MiddlewareInput, opt?: Pick<MiddlewareConfig, 'mergeType'>) {
    const parsedCommand = this.getParsedCommand(clz);
    if (parsedCommand) parsedCommand.addMiddlewares('execution', { ...opt, middleware: fn });
  }
}
