import { DefineCommand, DefineOption, Middleware } from '@artus-cli/artus-cli';
import { DevCommand as BaseDevCommand, DevOption as BaseDevOption } from 'egg-bin';

export interface DevOption extends BaseDevOption {
  other?: string;
  daemon?: boolean;
}

@DefineCommand({
  description: 'Run the development server with chair-bin',
})
@Middleware(async (_ctx, next) => {
  console.info('chair-bin dev command prerun');
  await next();
  console.info('chair-bin dev command postrun');
})
export class ChairDevCommand extends BaseDevCommand {
  @DefineOption<DevOption>({
    other: {
      type: 'string',
      alias: 'o',
    },

    daemon: {
      type: 'boolean',
      default: false,
    },
  })
  options: DevOption;

  async run() {
    super.run();
    console.info('other', this.options.other);
    console.info('daemon', this.options.daemon);
  }
}
