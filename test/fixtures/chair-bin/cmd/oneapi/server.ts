import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'oneapi server [appName]',
  description: 'Run the oneapi server',
})
export class OneapiServerCommand extends Command {
  @Option()
  appName: string;

  async run() {
    console.info('oneapi server', this.appName);
  }
}
