import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

interface Option {
  port?: number;
  inspect?: boolean;
}

@DefineCommand({
  command: '$0 <port>',
})
export class ArgumentMainComand extends Command {
  @Option({
    alias: 'i',
  })
  inspect: boolean;

  async run() {
    console.info('main');
  }
}
