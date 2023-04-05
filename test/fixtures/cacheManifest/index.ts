import { DefineCommand, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'dev',
  description: 'Run simple dev',
}, { overrideCommand: true })
export class ChairDevCommand extends Command {
  async run() {
    console.info('extractly override');
  }
}
