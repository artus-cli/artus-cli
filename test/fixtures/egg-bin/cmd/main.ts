import { DefineCommand, Command, Option } from '@artus-cli/artus-cli';

@DefineCommand()
export class MainCommand extends Command {
  @Option({
    alias: 'c',
  })
  cwd?: string;

  async run() {
    if (this.cwd) {
      return console.info('main in', this.cwd);
    }

    console.info('main');
  }
}
