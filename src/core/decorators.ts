import { addTag, Injectable, ScopeEnum, Inject } from '@artus/core';
import { MetadataEnum, CONTEXT_SYMBOL, EXCUTION_SYMBOL, COMMAND_OPTION_SYMBOL } from '../constant';
import { ParsedCommands } from '../core/parsed_commands';
import { CommandContext, CommandOutput } from './context';
import compose from 'koa-compose';
import { Command } from './command';
import { checkCommandCompatible, getCalleeList } from '../utils';
import { BaseMeta, MiddlewareMeta, MiddlewareInput, MiddlewareConfig, CommandConfig, OptionProps, OptionMeta, ConvertTypeToBasicType, CommandMeta } from '../types';

export interface CommonDecoratorOption extends Pick<BaseMeta, 'inheritMetadata'> {}
export interface MiddlewareDecoratorOption extends CommonDecoratorOption, Pick<MiddlewareConfig, 'mergeType'> {}
export interface CommandDecoratorOption extends CommonDecoratorOption, Pick<CommandMeta, 'overrideCommand'> {}

export function DefineCommand(
  opt?: CommandConfig,
  option?: CommandDecoratorOption,
) {
  return <T extends typeof Command>(target: T) => {
    const calleeList = getCalleeList(15);
    const tslibLocation = calleeList.findIndex(({ methodName, fileName }) => methodName === '__decorate' && fileName.includes('tslib'));
    const commandLocation = tslibLocation < 0 ? null : calleeList[tslibLocation + 1];

    Reflect.defineMetadata(MetadataEnum.COMMAND, {
      config: opt || {},
      location: commandLocation?.fileName,
      overrideCommand: option?.overrideCommand,
      inheritMetadata: option?.inheritMetadata,
    } satisfies CommandMeta, target);

    addTag(MetadataEnum.COMMAND, target);
    Injectable({ scope: ScopeEnum.EXECUTION })(target);

    wrapWithMiddleware(target);
    return target;
  };
}

export function Options<T extends Record<string, any> = Record<string, any>>(
  meta?: { [P in keyof Omit<T, '_' | '--'>]?: OptionProps<ConvertTypeToBasicType<T[P]>, T[P]>; },
) {
  return <G extends Command>(target: G, key: string) => {
    const result = initOptionMeta(target);
    Object.assign(result.config, meta);
    Object.defineProperty(target, key, {
      get() {
        return this[COMMAND_OPTION_SYMBOL];
      },

      set(val) {
        this[COMMAND_OPTION_SYMBOL] = val;
      },
    });
  };
}

export function Option(descOrOpt?: string | OptionProps) {
  return <G extends Command>(target: G, key: string) => {
    const result = initOptionMeta(target);
    const config: OptionProps = typeof descOrOpt === 'string'
      ? { description: descOrOpt }
      : (descOrOpt || {});

    const designType = Reflect.getOwnMetadata('design:type', target, key);
    if (designType === String) {
      config.type = 'string';  
    } else if (designType === Number) {
      config.type = 'number';
    } else if (designType === Boolean) {
      config.type = 'boolean';
    } else if (designType === Array) {
      config.array = true;
    }

    // merge with exists config
    result.config[key] = {
      ...result.config[key],
      ...config,
    };

    Object.defineProperty(target, key, {
      get() {
        return this[COMMAND_OPTION_SYMBOL][key];
      },

      set(val) {
        this[COMMAND_OPTION_SYMBOL][key] = val;
      },
    });
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

    if (typeof option?.inheritMetadata === 'boolean' && typeof existsMeta.inheritMetadata === 'boolean' && existsMeta.inheritMetadata !== option.inheritMetadata) {
      throw new Error(`Can\'t use inheritMetadata in multiple @Middleware`);
    }

    existsMeta.inheritMetadata = option?.inheritMetadata;
    Reflect.defineMetadata(metaKey, existsMeta, ctor);
  };
}

function initOptionMeta(target: Command): OptionMeta {
  const ctor = target.constructor as typeof Command;
  if (!Reflect.hasOwnMetadata(MetadataEnum.OPTION, ctor)) {
    // define option key
    const optionCacheSymbol = Symbol(`${ctor.name}#cache`);
    Object.defineProperty(target, COMMAND_OPTION_SYMBOL, {
      get() {
        if (this[optionCacheSymbol]) return this[optionCacheSymbol];
        const ctx: CommandContext = this[CONTEXT_SYMBOL];
        if (!ctx) return;

        const { matched, args, raw: argv } = ctx;
        const parsedCommands = ctx.container.get(ParsedCommands);
        const targetCommand = parsedCommands.getCommand(ctor);
        // check target command whether is compatible with matched
        const isSameCommandOrCompatible = matched?.clz === ctor || (matched && targetCommand && checkCommandCompatible(targetCommand, matched));
        this[optionCacheSymbol] = isSameCommandOrCompatible ? args : parsedCommands.parseArgs(argv, targetCommand).args;
        return this[optionCacheSymbol];
      },

      set(val: any) {
        // allow developer to override options
        this[optionCacheSymbol] = val;
      },
    });

    const optionMeta = {
      config: {},
    } satisfies OptionMeta;

    Reflect.defineMetadata(MetadataEnum.OPTION, optionMeta, ctor);
  }

  return Reflect.getOwnMetadata(MetadataEnum.OPTION, ctor);
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
      return compose([
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
      return compose([
        ...parsedCommand?.commandMiddlewares || [],
        async () => this.run(...args),
      ])(ctx);
    },
  });
}
