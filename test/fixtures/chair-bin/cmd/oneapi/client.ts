import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'oneapi client [appName]',
  description: 'Run the oneapi client',
})
export class OneapiClientCommand extends Command {
  @Option()
  appName: string;

  async run() {
    console.info('oneapi client', this.appName);
  }
}
