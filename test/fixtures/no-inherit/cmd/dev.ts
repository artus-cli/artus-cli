import { DefineCommand, Middleware } from '@artus-cli/artus-cli';
import { DevCommand as BaseDevCommand } from 'egg-bin';

@DefineCommand({
  command: 'dev',
  description: 'Run the development server with chair-bin',
})
@Middleware(async (_ctx, next) => {
  console.info('noinherit-bin dev command prerun');
  await next();
  console.info('noinherit-bin dev command postrun');
})
export class ChairDevCommand extends BaseDevCommand {
  async run() {
    console.info(super.run());
    return {} as any;
  }
}
