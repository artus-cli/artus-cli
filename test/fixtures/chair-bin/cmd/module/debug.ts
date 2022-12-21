import { DefineCommand } from '@artus-cli/artus-cli';
import { ModuleMainCommand } from './main';
import { DebugCommand } from 'egg-bin';

@DefineCommand({
  description: 'Module Debug Commands',
  parent: ModuleMainCommand,
})
export class ModuleDebugCommand extends DebugCommand {
  async run() {
    console.info('module is debug in', this.args.baseDir);
    return {} as any;
  }
}
