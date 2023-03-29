import { debuglog } from 'node:util';
import { Injectable, Container, Inject, ScopeEnum } from '@artus/core';
import { parseArgvToArgs, parseArgvWithPositional } from './parser';
import { Command } from './command';
import { MetadataEnum } from '../constant';
import { BinInfo } from './bin_info';
import { errors, ArtusCliError } from '../errors';
import { ParsedCommand } from './parsed_command';
import { ParsedCommandTree } from './parsed_command_tree';

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
      const tree = this.container.get(ParsedCommandTree);
      tree.build(commandList);
      this[TREE_SYMBOL] = tree;
    }
    return this[TREE_SYMBOL];
  }

  get root() {
    return this.tree.root!;
  }

  get commands() {
    return this.tree.commands;
  }

  /** match command by argv */
  private _matchCommand(argv: string | string[]) {
    const result: MatchResult & { positionalArgs: Record<string, any> } = {
      fuzzyMatched: this.root,
      args: this.parseArgs(argv).args,

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
        c.enable && (c.cmd === el || c.alias.includes(el))
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

    // match empty command or not enable command
    if (!result.matched.isRunable && this.binInfo.strictCommands) {
      result.error = errors.command_is_not_implement(`${this.binInfo.binName}${printArgv ? ` ${printArgv}` : ''}`);
      debug(result.error.message);
    }

    return result;
  }

  /** parse argv with yargs-parser */
  parseArgs(argv: string | string[], parseCommand?: ParsedCommand) {
    const result = parseArgvToArgs(argv, {
      optionConfig: parseCommand?.options,
      strictOptions: this.binInfo.strictOptions,
    });

    return result;
  }

  /** match command by argv */
  matchCommand(argv: string | string[]): MatchResult {
    const result = this._matchCommand(argv);

    // parse again with parserOption and validation
    const parseResult = this.parseArgs(argv, result.fuzzyMatched);
    result.error = result.error || parseResult.error;

    // merge args and positional args
    result.args = Object.assign(parseResult.args, result.positionalArgs);
    return result;
  }

  /** get parsed command by command */
  getCommand(clz: typeof Command) {
    return this.tree.get(clz);
  }
}
