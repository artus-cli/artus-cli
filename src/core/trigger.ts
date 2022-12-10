import { Trigger, Injectable, ScopeEnum, Inject, ArtusInjectEnum } from '@artus/core';
import { Context, Output } from '@artus/pipeline';
import Debug from 'debug';
import path from 'node:path';
import fs from 'node:fs/promises';
import { EXCUTION_SYMBOL } from '../constant';
import { CommonBinConfig, CommonBinInfo } from '../types';
import { CommandContext, CommandInput } from './context';
const BIN_INFO_SYMBOL = Symbol('Program#binInfoSymbol');
const debug = Debug('artus-cli#trigger');

@Injectable({ scope: ScopeEnum.SINGLETON })
export class CommandTrigger extends Trigger {
  binInfo?: CommonBinInfo;

  @Inject(ArtusInjectEnum.Config)
  config: CommonBinConfig;

  async start() {
    // core middleware
    this.use(async (ctx: Context, next) => {
      await next();

      const { matched, error } = ctx.container.get(CommandContext);

      // match error, throw
      if (error) throw error;
      if (!matched) {
        debug('Can not match any command, exit...');
        return;
      }

      const commandInstance = ctx.container.get(matched.clz);
      debug('Run command %s', matched.clz.name);

      // execute command
      const result = await commandInstance[EXCUTION_SYMBOL]();
      ctx.output.data = { result };
    });

    await this.execute();
  }

  async init() {
    // init binInfo
    const config: CommonBinConfig = this.config;
    let pkgInfo;
    try {
      const pkgPath = path.resolve(config.baseDir, './package.json');
      pkgInfo = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    } catch (e) {
      // nothing
    }

    this.binInfo = {
      ...pkgInfo,
      binName: config.binName,
      baseDir: config.baseDir,
    };

    this.use(async (ctx: CommandContext, next) => {
      // parse argv and match command
      await ctx.init();
      await next();
    });
  }

  /** override artus context */
  async initContext(input?: CommandInput, output?: Output): Promise<Context> {
    const baseCtx = await super.initContext(input, output);
    const cmdCtx = baseCtx.container.get(CommandContext);
    cmdCtx.container = baseCtx.container;
    cmdCtx.container.set({ id: CommandContext, value: cmdCtx });
    cmdCtx.input = baseCtx.input as CommandInput;
    cmdCtx.output = baseCtx.output;
    return cmdCtx;
  }

  /** start a pipeline and execute */
  async execute(input?: Partial<CommandInput['params']>) {
    try {
      const ctx = await this.initContext({
        params: {
          // set input data
          argv: process.argv.slice(2),
          env: { ...process.env },
          cwd: process.cwd(),
          ...input,
        },
      });

      ctx.container.set({ id: Context, value: ctx });

      await this.startPipeline(ctx);
    } catch (err) {
      console.error(err);
    }
  }
}
