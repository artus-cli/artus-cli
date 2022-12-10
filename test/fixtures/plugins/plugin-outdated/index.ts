import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus-cli/artus-cli';
import { Program, CommandContext, Utils } from '@artus-cli/artus-cli';

@LifecycleHookUnit()
export default class OutdatedLifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly program: Program;

  @LifecycleHook()
  async configDidLoad() {
    // add global options
    this.program.option({
      outdated: {
        type: 'boolean',
        description: 'Check whether the current version is outdated',
        default: true,
      },
    });

    this.program.use(async (ctx: CommandContext, next) => {
      // if (ctx.args.outdated) {

      // }
      // const { fuzzyMatched, matched, args, bin, raw } = ctx;
      // if (!fuzzyMatched || !args.help) {
      //   if (!matched) {
      //     // can not match any command
      //     console.error(`\n Command not found: '${bin} ${raw.join(' ')}', try '${fuzzyMatched?.cmds.join(' ') || bin} --help' for more information.\n`);
      //     process.exit(1);
      //   }

      //   return await next();
      // }

      // // redirect to help command
      // const helper = ctx.container.get(Utils);
      // await helper.redirect(['help', fuzzyMatched.uid]);
    });
  }
}
