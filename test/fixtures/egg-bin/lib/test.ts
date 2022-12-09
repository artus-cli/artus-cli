import { DefineCommand, DefineOption, Command, Middleware } from 'artus-cli';

export interface TestOption {
  baseDir: string;
  file: string[]
}

@DefineCommand({
  command: 'test <baseDir> [file...]',
  description: 'Run the unitest',
  alias: [ 't' ],
})
export class TestCommand extends Command {
  @DefineOption()
  options: TestOption;

  @Middleware([
    async (_ctx, next) => {
      console.info('test command middleware 2');
      await next();
    },
    async (_ctx, next) => {
      console.info('test command middleware 3');
      await next();
    },
  ])
  @Middleware(async (_ctx, next) => {
    console.info('test command middleware 1');
    await next();
  })
  async run() {
    console.info('test baseDir', this.options.baseDir);
    console.info('test files', this.options.file);
  }
}
