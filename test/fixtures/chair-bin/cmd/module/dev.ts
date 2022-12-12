import { DefineCommand, Command } from '@artus-cli/artus-cli';
import { ModuleMainCommand } from './main';
import { ChairDevCommand } from '../dev';

@DefineCommand({
  description: 'Module Dev Commands',
  parent: ModuleMainCommand,
})
export class ModuleDevCommand extends ChairDevCommand {
  async run() {
    console.info('module is dev in', this.options.baseDir);
    return {} as any;
  }
}
