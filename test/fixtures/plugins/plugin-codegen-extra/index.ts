import { DefineCommand, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'codegen extra',
  description: 'codegen extra plugin',
  alias: 'ex',
})
export class CodegenExtraCommand extends Command {
  async run() {
    console.info('run extra codegen in codegen extra');
  }
}
