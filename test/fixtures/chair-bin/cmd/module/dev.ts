import { DefineCommand } from '@artus-cli/artus-cli';
import { ModuleMainCommand } from './main';
import { ChairDevCommand } from '../dev';

@DefineCommand({
  description: 'Module Dev Commands',
  parent: ModuleMainCommand,
})
export class ModuleDevCommand extends ChairDevCommand {
  async run() {
    console.info('module is dev in', this.args.baseDir);
    return {} as any;
  }
}
