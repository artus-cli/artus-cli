import { DefineCommand, Option, Options, Command, Middleware } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'dev [baseDir]',
  description: 'Run the development server',
  alias: [ 'd' ],
})
@Middleware(async (_ctx, next) => {
  console.info('egg-bin dev command prerun');
  await next();
  console.info('egg-bin dev command postrun');
})
export class DevCommand extends Command {
  @Option({
    alias: 'p',
    default: 3000,
    description: 'Start A Server',
  })
  port: number;

  @Option({
    default: false,
    description: 'Debug with node-inspector',
  })
  inspect: boolean;

  @Option('Built-in flags in node')
  nodeFlags: string;

  @Option()
  baseDir: string;

  @Options()
  args: any;

  async run() {
    console.info('port', this.port);
    console.info('inspect', this.inspect);
    console.info('nodeFlags', this.nodeFlags);
    console.info('baseDir', this.baseDir);
    console.info('_', this._);
    console.info('--', this['--']);
    return {
      command: 'dev',
      args: this.args,
    };
  }
}
