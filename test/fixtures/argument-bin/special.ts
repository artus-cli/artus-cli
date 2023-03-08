import { DefineCommand, Options, Command } from '@artus-cli/artus-cli';

interface Option {
  baseDir: string;
}

@DefineCommand({
  command: 'dev [baseDir]',
})
export class ArgumentDevComand extends Command {
  @Options<Option>({
    baseDir: { type: 'string' },
  })
  opt: Option;

  async run() {
    console.info('baseDir', this.opt.baseDir);
  }
}

interface DebugOption {
  port: number;
}

@DefineCommand({
  command: 'debug',
})
export class ArgumentDebugComand extends ArgumentDevComand {
  @Options<DebugOption>({
    port: { type: 'number' },
  })
  argv: DebugOption;

  async run() {
    console.info('baseDir', this.argv.port);
  }
}
