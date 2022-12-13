import { DefineCommand, DefineOption, Command } from '@artus-cli/artus-cli';

interface Option {
  port?: number;
  inspect?: boolean;
}

@DefineCommand({
  command: '$0 [port]',
})
export class ArgumentMainComand extends Command {
  @DefineOption<Option>({
    port: {
      type: 'number',
      default: 3000,
    },

    inspect: {
      type: 'boolean',
      description: 'Inspect',
    },
  })
  opt: Option;

  async run() {
    console.info('serv in port', this.opt.port);
    if (this.opt.inspect) console.info('serv is inspecting...');
  }
}
