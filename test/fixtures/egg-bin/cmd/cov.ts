import { DefineCommand, Option, Command, Inject } from '@artus-cli/artus-cli';
import { TestCommand } from './test';

@DefineCommand({
  command: 'cov <baseDir> [file...]',
  description: 'Run the coverage',
})
export class CovCommand extends Command {
  @Option({ default: true })
  c8: boolean;

  @Inject()
  testCommand: TestCommand;

  async run() {
    console.info('coverage c8', this.c8);
    return this.testCommand.run();
  }
}
