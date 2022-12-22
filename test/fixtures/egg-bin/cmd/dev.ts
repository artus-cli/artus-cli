import { DefineCommand, DefineOption, Command, Middleware, Option } from '@artus-cli/artus-cli';

export interface DevOption extends Option {
  port?: number;
  inspect?: boolean;
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
  args: DevOption;

  async run() {
    console.info('port', this.args.port);
    console.info('inspect', this.args.inspect);
    console.info('nodeFlags', this.args.nodeFlags);
    console.info('baseDir', this.args.baseDir);
    return {
      command: 'dev',
      args: this.args,
    };
  }
}
