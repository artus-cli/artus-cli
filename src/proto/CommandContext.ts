import { ArtusApplication, ArtusInjectEnum, Inject, Injectable, ScopeEnum } from '@artus/core';
import { Context, Input } from '@artus/pipeline';
import { ParsedCommands, MatchResult } from './ParsedCommands.js';
const RAW_SYMBOL = Symbol('CommandContext#raw');

export interface CommandInput extends Input {
  params: {
    argv: string[];
    env: Record<string, string>;
    cwd: string;
  };
}

/**
 * Command Context, store `argv`/`env`/`cwd`/`match result` ...
 */
@Injectable({ scope: ScopeEnum.SINGLETON })
export class CommandContext<T extends Record<string, any> = Record<string, any>> extends Context {
  @Inject(ArtusInjectEnum.Application)
  private readonly app: ArtusApplication;

  @Inject()
  private readonly parsedCommands: ParsedCommands;

  /** matched result */
  private matchResult: MatchResult;

  bin: string;
  env: Record<string, string>;
  cwd: string;
  input: CommandInput;

  init() {
    const params = this.input.params;
    this.bin = this.app.config.bin;
    this.env = params.env;
    this.cwd = params.cwd;
    this.raw = params.argv;
    return this;
  }

  /**
   * same as argv in process.argv
   * using `raw` instead of `argv` to avoid feeling confusing between `argv` and `args`
   */
  get raw() {
    return this[RAW_SYMBOL];
  }

  set raw(val: string[]) {
    this[RAW_SYMBOL] = val;
    this.parse();
  }

  get commands() {
    return this.parsedCommands.commands;
  }

  get rootCommand() {
    return this.parsedCommands.root;
  }

  get args() {
    return this.matchResult.args as T;
  }

  get fuzzyMatched() {
    return this.matchResult.fuzzyMatched;
  }

  get matched() {
    return this.matchResult.matched;
  }

  get error() {
    return this.matchResult.error;
  }

  private parse() {
    this.matchResult = this.parsedCommands.matchCommand(this.raw);
  }
}
