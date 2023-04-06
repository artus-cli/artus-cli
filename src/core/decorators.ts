import { addTag, Injectable, ScopeEnum, Inject } from '@artus/core';
import { MetadataEnum, CONTEXT_SYMBOL, EXCUTION_SYMBOL, OptionInjectType } from '../constant';
import { ParsedCommands } from '../core/parsed_commands';
import { CommandContext, CommandOutput } from './context';
import compose from 'koa-compose';
import { Command } from './command';
import { getCalleeList } from '../utils';
import { MiddlewareMeta, MiddlewareInput, MiddlewareConfig, CommandConfig, OptionProps, OptionMeta, ConvertTypeToBasicType, CommandMeta } from '../types';

export interface MiddlewareDecoratorOption extends Pick<MiddlewareConfig, 'mergeType'> {}
export interface CommandDecoratorOption extends Pick<CommandMeta, 'overrideCommand' | 'inheritMetadata'> {}

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

    // inject ctx to proto
    Inject(CommandContext)(target, CONTEXT_SYMBOL);
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
    result.injections.push({
      propName: key,
      type: OptionInjectType.FULL_OPTION,
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

    result.injections.push({
      propName: key,
      type: OptionInjectType.KEY_OPTION,
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

    Reflect.defineMetadata(metaKey, existsMeta, ctor);
  };
}

function initOptionMeta(target: Command): OptionMeta {
  const ctor = target.constructor as typeof Command;
  if (!Reflect.hasOwnMetadata(MetadataEnum.OPTION, ctor)) {
    const optionMeta = {
      config: {},
      injections: [],
    } satisfies OptionMeta;

    Reflect.defineMetadata(MetadataEnum.OPTION, optionMeta, ctor);
  }

  return Reflect.getOwnMetadata(MetadataEnum.OPTION, ctor);
}

/**
 * wrap middleware logic in command class
 */
function wrapWithMiddleware(clz) {
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
