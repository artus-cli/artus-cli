import { addTag, Injectable, ScopeEnum, Inject } from '@artus/core';
import { MetadataEnum, CONTEXT_SYMBOL, EXCUTION_SYMBOL } from '../constant';
import { ParsedCommands } from '../core/parsed_commands';
import { CommandContext, CommandOutput } from './context';
import compose from 'koa-compose';
import { Command } from './command';
import { checkCommandCompatible } from '../utils';
import { MiddlewareMeta, MiddlewareInput, MiddlewareConfig, CommandConfig, OptionProps, OptionMeta, CommandMeta, OptionConfig } from '../types';

export interface CommonDecoratorOption {
  /** whether merge meta info of prototype */
  override?: boolean;
}

export interface MiddlewareDecoratorOption extends CommonDecoratorOption, Pick<MiddlewareConfig, 'mergeType'> {
  // nothing
}

export function DefineCommand(
  opt?: CommandConfig,
  option?: CommonDecoratorOption,
) {
  return <T extends typeof Command>(target: T) => {
    Reflect.defineMetadata(MetadataEnum.COMMAND, {
      config: opt || {},
      override: option?.override,
    }, target);

    addTag(MetadataEnum.COMMAND, target);
    Injectable({ scope: ScopeEnum.EXECUTION })(target);

    wrapWithMiddleware(target);
    return target;
  };
}

export function DefineOption<T extends object = object>(
  meta?: { [P in keyof Omit<T, '_' | '--'>]?: OptionProps; },
  option?: CommonDecoratorOption,
) {
  return <G extends Command>(target: G, key: string) => {
    const ctor = target.constructor as typeof Command;

    // define option key
    const keySymbol = Symbol(`${ctor.name}#${key}`);
    Object.defineProperty(ctor.prototype, key, {
      get() {
        if (this[keySymbol]) return this[keySymbol];
        const ctx: CommandContext = this[CONTEXT_SYMBOL];
        if (!ctx) return;

        const { matched, args, raw: argv } = ctx;
        const parsedCommands = ctx.container.get(ParsedCommands);
        const targetCommand = parsedCommands.getCommand(ctor);
        // check target command whether is compatible with matched
        const isSameCommandOrCompatible = matched?.clz === ctor || (matched && targetCommand && checkCommandCompatible(targetCommand, matched));
        this[keySymbol] = isSameCommandOrCompatible ? args : parsedCommands.parseArgs(argv, targetCommand);
        return this[keySymbol];
      },

      set(val: any) {
        // allow developer to override options
        this[keySymbol] = val;
      },
    });

    const config = (meta || {}) as OptionConfig;
    Reflect.defineMetadata(
      MetadataEnum.OPTION,
      { key, config, override: option?.override } satisfies OptionMeta,
      ctor,
    );
  };
}

export function Middleware(fn: MiddlewareInput, option?: MiddlewareDecoratorOption) {
  return <T extends (typeof Command) | Command>(target: T, key?: 'run') => {
    if (key && key !== 'run') throw new Error('Middleware can only be used in Command Class or run method');

    const ctor = key ? target.constructor : target;
    const metaKey = key ? MetadataEnum.RUN_MIDDLEWARE : MetadataEnum.MIDDLEWARE;
    const existsMeta: MiddlewareMeta = Reflect.getOwnMetadata(metaKey, ctor) || ({ configList: [] });

    // add config in meta data
    existsMeta.configList.push({
      middleware: fn,
      mergeType: option?.mergeType || 'after',
    });

    if (typeof option?.override === 'boolean' && typeof existsMeta.override === 'boolean' && existsMeta.override !== option.override) {
      throw new Error(`Can\'t use override in multiple @Middleware`);
    }

    existsMeta.override = option?.override;
    Reflect.defineMetadata(metaKey, existsMeta, ctor);
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
      const parsedCommand = ctx.container.get(ParsedCommands).getCommand(clz);

      // compose with middlewares in run method
      return await compose([
        ...parsedCommand?.executionMiddlewares || [],
        async (ctx: CommandContext) => {
          const result = await runMethod.apply(this, args);
          ctx.output.data = { result } satisfies CommandOutput['data'];
          return result;
        },
      ])(ctx);
    },
  });

  // add execution method
  Object.defineProperty(clz.prototype, EXCUTION_SYMBOL, {
    async value(...args: any[]) {
      const ctx: CommandContext = this[CONTEXT_SYMBOL];
      const parsedCommand = ctx.container.get(ParsedCommands).getCommand(clz);

      // compose with middlewares in Command Class
      return await compose([
        ...parsedCommand?.commandMiddlewares || [],
        async () => this.run(...args),
      ])(ctx);
    },
  });
}
