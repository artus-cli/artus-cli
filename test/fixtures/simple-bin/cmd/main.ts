// index.ts
import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'simple-bin [baseDir]',
  description: 'My Simple Bin',
})
export class MainCommand extends Command {
  @Option({
    alias: 'p',
    description: 'port',
  })
  port: number;

  @Option()
  baseDir: string;

  async run() {
    console.info('Run with port %s in %s', this.port, this.baseDir);
  }
}
