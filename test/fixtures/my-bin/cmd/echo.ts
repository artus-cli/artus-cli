import '../../common';
import { DefineCommand, DefineOption, Inject } from '@artus-cli/artus-cli';
import { ShareService } from '../lib/share';

interface EchoOptions {
  str?: string[];
}

@DefineCommand({
  command: 'echo [str...]',
  description: 'echo command',
})
export class EchoCommand {
  @Inject()
  shareService: ShareService;

  @DefineOption<EchoOptions>({
    str: {
      type: 'array',
    },
  })
  args: EchoOptions;

  async run() {
    await this.shareService.run();
    console.info('inspect: %s', this.args.str);
  }
}
