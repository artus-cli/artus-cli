import { addTag, Injectable, ScopeEnum, Inject } from '@artus/core';
import { MiddlewareInput, Middlewares } from '@artus/pipeline';
import { MetadataEnum, CONTEXT_SYMBOL, EXCUTION_SYMBOL } from '../constant.js';
import { ParsedCommands } from '../proto/ParsedCommands.js';
import { CommandContext } from '../proto/CommandContext.js';
import compose from 'koa-compose';
import { Command } from '../proto/Command.js';
import { checkCommandCompatible } from '../utils.js';
import { CommandProps, OptionProps, OptionMeta, CommandMeta } from '../types.js';

export interface CommonDecoratorOption {
  /** whether merge meta info of prototype */
  override?: boolean;
}

export interface MiddlewareDecoratorOption extends CommonDecoratorOption {
  /** default is after */
  mergeType?: 'before' | 'after'
}

export function DefineCommand(
  opt?: CommandProps,
  option?: CommonDecoratorOption,
) {
  return <T extends typeof Command>(target: T) => {
    let meta: CommandMeta = { ...opt };

    // merge meta of prototype
    if (!option?.override) {
      const protoMeta = Reflect.getMetadata(MetadataEnum.COMMAND, Object.getPrototypeOf(target));
      meta = Object.assign({}, protoMeta, meta);
    }

    // default command is main command
    meta.command = meta.command || '$0';
    Reflect.defineMetadata(MetadataEnum.COMMAND, meta, target);
    addTag(MetadataEnum.COMMAND, target);
    Injectable({ scope: ScopeEnum.EXECUTION })(target);

    wrapWithMiddleware(target);
    return target;
  };
}

export function DefineOption<T extends object = object>(
  meta?: { [P in keyof T]?: OptionProps; },
  option?: CommonDecoratorOption,
) {
  return <G extends Command>(target: G, key: string) => {
    const ctor = target.constructor as typeof Command;

    // merge meta of prototype
    if (!option?.override) {
      const protoMeta = Reflect.getMetadata(MetadataEnum.OPTION, Object.getPrototypeOf(ctor));
      meta = Object.assign({}, protoMeta?.meta, meta);
    }

    // define option key
    const keySymbol = Symbol(`${ctor.name}#${key}`);
    Object.defineProperty(ctor.prototype, key, {
      get() {
        if (this[keySymbol]) return this[keySymbol];
        const ctx: CommandContext = this[CONTEXT_SYMBOL];
        const { matched, args, raw: argv } = ctx;
        const parsedCommands = ctx.container.get(ParsedCommands);
        const targetCommand = parsedCommands.getCommand(ctor);
        // check target command whether is compatible with matched
        const isSameCommandOrCompatible = matched.clz === ctor || checkCommandCompatible(targetCommand, matched);
        this[keySymbol] = isSameCommandOrCompatible ? args : parsedCommands.parseArgs(argv, targetCommand);
        return this[keySymbol];
      },

      set(val: any) {
        // allow developer to override options
        this[keySymbol] = val;
      },
    });

    Reflect.defineMetadata(
      MetadataEnum.OPTION,
      { key, meta } satisfies OptionMeta,
      ctor,
    );
  };
}

export function Middleware(fn: MiddlewareInput, option?: MiddlewareDecoratorOption) {
  return <T extends (typeof Command) | Command>(target: T, key?: 'run') => {
    if (key && key !== 'run') throw new Error('Middleware can only be used in Command Class or run method');

    const ctor = key ? target.constructor : target;
    const metaKey = key ? MetadataEnum.RUN_MIDDLEWARE : MetadataEnum.MIDDLEWARE;
    const fns = (Array.isArray(fn) ? fn : [ fn ]) as Middlewares;
    let existsFns: Middlewares = Reflect.getOwnMetadata(metaKey, ctor);

    // merge meta of prototype, only works in class
    if (!key && !option?.override && !existsFns) {
      const protoMeta = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, Object.getPrototypeOf(ctor));
      existsFns = protoMeta;
    }

    existsFns = existsFns || [];

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
    if (!option?.mergeType || option?.mergeType === 'after') {
      existsFns = existsFns.concat(fns);
    } else {
      existsFns = fns.concat(existsFns);
    }

    Reflect.defineMetadata(metaKey, existsFns, ctor);
  };
}

/**
 * wrap middleware logic in command class
 */
function wrapWithMiddleware(clz) {
  // inject ctx to proto
  Inject(CommandContext)(clz, CONTEXT_SYMBOL);

  // override run method
  const runMethod = clz.prototype.run;
  Object.defineProperty(clz.prototype, 'run', {
    async value(...args: any[]) {
      const ctx: CommandContext = this[CONTEXT_SYMBOL];
      // compose with middlewares in run method
      const middlewares = Reflect.getOwnMetadata(MetadataEnum.RUN_MIDDLEWARE, clz) || [];
      return await compose([
        ...middlewares,
        async () => await runMethod.apply(this, args),
      ])(ctx);
    },
  });

  // add execution method
  Object.defineProperty(clz.prototype, EXCUTION_SYMBOL, {
    async value(...args: any[]) {
      const ctx: CommandContext = this[CONTEXT_SYMBOL];
      // compose with middlewares in Command Class
      const middlewares = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, clz) || [];
      return await compose([
        ...middlewares,
        async () => await this.run(...args),
      ])(ctx);
    },
  });
}
