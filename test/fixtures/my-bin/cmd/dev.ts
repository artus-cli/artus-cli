import '../../common';
import { DefineCommand, DefineOption, Command } from '@artus-cli/artus-cli';

export interface DevOptions {
  port?: number;
  baseDir?: string;
}

@DefineCommand({
  command: 'dev [baseDir]',
  description: 'Run the development server',
  alias: [ 'd' ],
})
export class DevCommand extends Command {
  @DefineOption<DevOptions>({
    port: {
      type: 'number',
      alias: 'p',
      default: 3000,
      description: 'port',
    },
  })
  args: DevOptions;

  async run() {
    console.info('port: %s', this.args.port);
    console.info('baseDir: %s', this.args.baseDir);
  }
}
