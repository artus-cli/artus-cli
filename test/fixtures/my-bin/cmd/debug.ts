import '../../common';
import { DefineCommand, DefineOption } from '@artus-cli/artus-cli';
import { DevCommand, DevOptions } from './dev';

interface DebugOptions extends DevOptions {
  inspect?: string;
}

@DefineCommand({
  command: 'debug [baseDir]',
  description: 'Run the development server at debug mode',
})
export class DebugCommand extends DevCommand {
  @DefineOption<DebugOptions>({
    inspect: {
      type: 'boolean',
      default: true,
      description: 'Enable debug mode',
    },
  })
  args: DebugOptions;

  async run() {
    await super.run();
    console.info('inspect: %s', this.args.inspect);
  }
}
