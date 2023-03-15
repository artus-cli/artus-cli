import { DefineCommand, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  enable: false,
  command: 'dev [baseDir]',
})
export class ArgumentDevComand extends Command {
  async run() {
    console.info('dev command');
  }
}

@DefineCommand({
  command: 'debug',
})
export class ArgumentDebugComand extends ArgumentDevComand {
  async run() {
    console.info('debug command');
  }
}
