import { DefineCommand, Option, Middleware } from '@artus-cli/artus-cli';
import { DevCommand as BaseDevCommand } from 'egg-bin';

@DefineCommand({
  description: 'Run the development server with chair-bin',
})
@Middleware(async (_ctx, next) => {
  console.info('chair-bin dev command prerun');
  await next();
  console.info('chair-bin dev command postrun');
})
export class ChairDevCommand extends BaseDevCommand {
  @Option({ alias: 'o' })
  other: string;

  @Option()
  daemon: boolean;

  async run() {
    const r = await super.run();
    console.info('other', this.other);
    console.info('daemon', this.daemon);
    return r;
  }
}
