import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import { Program, CommandContext, Utils } from '../../';

@LifecycleHookUnit()
export default class UsageLifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly program: Program;

  @LifecycleHook()
  async configDidLoad() {
    // add global options
    this.program.option({
      help: {
        type: 'boolean',
        description: 'Show Help',
        alias: 'h',
      },
    });

    this.program.use(async (ctx: CommandContext, next) => {
      const { bin } = this.program;
      const { fuzzyMatched, matched, args, raw } = ctx;
      if (!fuzzyMatched || !args.help) {
        if (!matched) {
          // can not match any command
          console.error(`\n Command not found: '${bin} ${raw.join(' ')}', try '${fuzzyMatched?.cmds.join(' ') || bin} --help' for more information.\n`);
          process.exit(1);
        }

        return await next();
      }

      // redirect to help command
      const helper = ctx.container.get(Utils);
      await helper.redirect([ 'help', fuzzyMatched.uid ]);
    });
  }
}
