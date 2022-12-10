/**
 * open api for user
 **/

import { Inject, Injectable, ArtusInjectEnum, ArtusApplication, ScopeEnum } from '@artus/core';
import { MiddlewareInput } from '@artus/pipeline';
import { CommandTrigger } from './trigger';
import { OptionProps } from '../types';
import { Command } from './command';
import { Middleware, MiddlewareDecoratorOption } from './decorators';
import { ParsedCommand, ParsedCommands } from './parsed_commands';

type MaybeParsedCommand = (typeof Command) | ParsedCommand;

@Injectable({ scope: ScopeEnum.SINGLETON })
export class Program {
  @Inject()
  private readonly trigger: CommandTrigger;

  @Inject()
  private readonly parsedCommands: ParsedCommands;

  /** all commands map */
  get commands() {
    return this.parsedCommands.commands;
  }

  /** root of command tree */
  get rootCommand() {
    return this.parsedCommands.root;
  }

  /** bin info, including pkgInfo and config */
  get binInfo() {
    return this.trigger.binInfo;
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
    effectCommands.forEach(c => this.getParsedCommand(c).updateGlobalOptions(opt));
  }

  /** register pipeline middleware */
  use(fn: MiddlewareInput) {
    return this.trigger.use(fn);
  }

  /** register middleware in command */
  useInCommand(clz: MaybeParsedCommand, fn: MiddlewareInput, opt?: MiddlewareDecoratorOption) {
    Middleware(fn, opt)(this.getParsedCommand(clz).clz);
  }

  /** register middleware in command.run */
  useInExecution(clz: MaybeParsedCommand, fn: MiddlewareInput, opt?: MiddlewareDecoratorOption) {
    Middleware(fn, opt)(this.getParsedCommand(clz).clz, 'run');
  }
}
