import { DefineCommand, Command } from 'artus-cli';

@DefineCommand({
  command: 'dev',
  description: 'Run simple dev',
  override: true,
})
export class ChairDevCommand extends Command {
  async run() {
    console.info('extractly override');
  }
}
