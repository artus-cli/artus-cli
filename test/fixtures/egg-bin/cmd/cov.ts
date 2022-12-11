import { DefineCommand, DefineOption, Command, Inject } from '@artus-cli/artus-cli';
import { TestCommand, TestOption } from './test';

interface CovOption extends TestOption {
  c8?: boolean;
}

@DefineCommand({
  command: 'cov <baseDir> [file...]',
  description: 'Run the coverage',
})
export class CovCommand extends Command {
  @DefineOption<CovOption>({
    c8: {
      type: 'boolean',
      default: true,
    },
  })
  options: CovOption;

  @Inject()
  testCommand: TestCommand;

  async run() {
    console.info('coverage c8', this.options.c8);
    return this.testCommand.run();
  }
}
