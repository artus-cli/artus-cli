import { Inject, Injectable, ScopeEnum } from '@artus/core';
import { Context } from '@artus/pipeline';
import { ParsedCommands, MatchResult } from './parsed_commands';
const RAW_SYMBOL = Symbol('CommandContext#raw');

export interface CommandInput {
  params: {
    argv: string[];
    env: Record<string, string | undefined>;
    cwd: string;
  };
}

export interface CommandOutput<T = any> {
  data: {
    result: T;
  };
}

/**
 * Command Context, store `argv`/`env`/`cwd`/`match result` ...
 */
@Injectable({ scope: ScopeEnum.SINGLETON })
export class CommandContext<
  InputArgs extends Record<string, any> = Record<string, any>,
  OutputResult = any,
> extends Context {
  @Inject()
  private readonly parsedCommands: ParsedCommands;

  /** matched result */
  private matchResult: MatchResult;

  env: Record<string, string | undefined>;
  cwd: string;
  input: CommandInput;
  output: CommandOutput<OutputResult>;

  init() {
    const params = this.input.params;
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
    return this.matchResult.args as InputArgs;
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
