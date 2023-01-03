import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

interface Option {
  port?: number;
  inspect?: boolean;
}

@DefineCommand({
  command: '$0 [port]',
})
export class ArgumentMainComand extends Command {
  @Option({ default: 3000 })
  port: number;

  @Option('Inspect')
  inspect: boolean;

  async run() {
    console.info('serv in port', this.port);
    if (this.inspect) console.info('serv is inspecting...');
  }
}
