import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import { Program, CommandContext } from '@artus-cli/artus-cli';

@LifecycleHookUnit()
export default class Lifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly program: Program;

  @LifecycleHook()
  async configDidLoad() {
    // add global options
    this.program.option({
      timing: {
        type: 'boolean',
        description: 'print time cost',
      },
    });

    this.program.use(async (ctx: CommandContext, next) => {
      const start = Date.now();
      await next();
      if (ctx.args.timing) {
        console.info(`Cost: ${Date.now() - start}ms`);
      }
    });
  }
}
