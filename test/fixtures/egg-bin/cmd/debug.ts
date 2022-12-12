import { DefineCommand, DefineOption } from '@artus-cli/artus-cli';
import { DevCommand, DevOption } from './dev';

interface DebugOption extends DevOption {
  flags?: string;
}

@DefineCommand({
  command: 'debug [baseDir]',
  description: 'Run the development server at debug mode',
})
export class DebugCommand extends DevCommand {
  @DefineOption<DebugOption>({
    flags: {
      type: 'number',
      alias: 'f',
      default: 0,
    },
  })
  args: DebugOption;

  async run() {
    console.info('port', this.args.port);
    console.info('inspect', this.args.inspect);
    console.info('flags', this.args.flags);
    console.info('baseDir', this.args.baseDir);
    return {
      command: 'debug',
      args: this.args,
    };
  }
}
