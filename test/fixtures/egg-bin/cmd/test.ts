import { DefineCommand, Option, Command, Middleware } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'test <baseDir> [file...]',
  description: 'Run the unitest',
  alias: [ 't' ],
})
export class TestCommand extends Command {
  @Option()
  baseDir: string;

  @Option()
  file: string[];

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
    console.info('test baseDir', this.baseDir);
    console.info('test files', this.file);
  }
}
