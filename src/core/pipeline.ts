import { debuglog } from 'node:util';
import { Pipeline, Context ,Output } from '@artus/pipeline';
import { ExecutionContainer } from '@artus/injection';
import { Application, ArtusInjectEnum, Inject, Injectable, ScopeEnum } from '@artus/core';
import { EXCUTION_SYMBOL, OptionInjectType } from '../constant';
import { CommandContext, CommandInput, CommandOutput } from './context';
import { ParsedCommand } from './parsed_command';

const debug = debuglog('artus-cli#pipeline');

@Injectable({ 
  id: 'ARTUS_PIPELINE',
  scope: ScopeEnum.SINGLETON,
})
export default class CommandPipeline extends Pipeline {

  @Inject(ArtusInjectEnum.Application)
  app: Application;

  get container() {
    return this.app.container;
  }

  async start() {
    // core middleware
    this.use(async (ctx: CommandContext, next) => {
      await next();

      const { matched, error } = this.container.get(CommandContext);

      // match error, throw
      if (error) throw error;
      if (!matched || !matched.isRunable) {
        debug('Can not match any command, exit...');
        return;
      }

      // execute command
      debug('Run command %s', matched.clz.name);
      await this.executeCommand(ctx, matched);
    });

    await this.executePipeline();
  }

  /** override artus context */
  async initContext(input?: CommandInput, output?: Output): Promise<CommandContext> {    
    const baseCtx = new Context(input, output);    
    const container = this.container;
    const execContainer = new ExecutionContainer(baseCtx, container);
    
    const cmdCtx = this.container.get(CommandContext);
    cmdCtx.container = execContainer;
    cmdCtx.container.set({ id: CommandContext, value: cmdCtx });
    cmdCtx.input = baseCtx.input as CommandInput;
    cmdCtx.output = baseCtx.output as CommandOutput;
    return cmdCtx;
  }

  /** start a pipeline and execute */
  async executePipeline(input?: Partial<CommandInput['params']>) {
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
      ctx.init();

      await this.run(ctx);
    } catch (err) {
      console.error(err);
      process.exit(typeof err.code === 'number' ? err.code : 1);
    }
  }

  /** execute command in pipeline */
  async executeCommand(ctx: CommandContext, cmd: ParsedCommand) {
    const instance = ctx.container.get(cmd.clz);
    cmd.injections.forEach(info => {
      if (info.type === OptionInjectType.FULL_OPTION) {
        instance[info.propName] = ctx.args;
      } else {
        const assignValue = ctx.args[info.propName];
        if (assignValue !== undefined) instance[info.propName] = assignValue;
      }
    });
    if (instance[EXCUTION_SYMBOL]) await instance[EXCUTION_SYMBOL]();
    return ctx.output.data;
  }
}
