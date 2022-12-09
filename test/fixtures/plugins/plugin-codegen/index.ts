import { DefineCommand, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'codegen',
  description: 'codegen plugin',
  alias: 'cg',
})
export class CodegenCommand extends Command {
  async run() {
    console.info('run codegen in codegen plugin');
  }
}
