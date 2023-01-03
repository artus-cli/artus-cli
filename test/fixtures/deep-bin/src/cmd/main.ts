// index.ts
import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: '$0 [baseDir]',
  description: 'My Deep Bin',
})
export class MainCommand extends Command {
  @Option({
    alias: 'p',
    default: 3000,
    description: 'port',
  })
  port: number;

  @Option()
  baseDir: string;

  async run() {
    console.info('Run with port %s in %s', this.port, this.baseDir);
  }
}
