import { DefineCommand, DefineOption, Command, Middleware } from 'artus-cli';

export interface DevOption {
  port?: number;
  inspect?: string;
  nodeFlags?: string;
  baseDir?: string;
}

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
  @DefineOption<DevOption>({
    port: {
      type: 'number',
      alias: 'p',
      default: 3000,
      description: 'Start A Server',
    },

    inspect: {
      type: 'boolean',
      default: false,
      description: 'Debug with node-inspector',
    },

    nodeFlags: {
      type: 'string',
    },
  })
  options: DevOption;

  async run() {
    console.info('port', this.options.port);
    console.info('inspect', this.options.inspect);
    console.info('nodeFlags', this.options.nodeFlags);
    console.info('baseDir', this.options.baseDir);
  }
}
