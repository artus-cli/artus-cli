import { DefineCommand, DefineOption, Command } from '@artus-cli/artus-cli';

interface Option {
  baseDir: string;
}

@DefineCommand({
  command: 'dev [baseDir]',
})
export class ArgumentDevComand extends Command {
  @DefineOption<Option>({
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
  @DefineOption<DebugOption>({
    port: { type: 'number' },
  })
  argv: DebugOption;

  async run() {
    console.info('baseDir', this.argv.port);
  }
}
