import { DefineCommand, Command } from 'artus-cli';
import { ModuleMainCommand } from './main.js';
import { DebugCommand } from 'egg-bin';

@DefineCommand({
  description: 'Module Debug Commands',
  parent: ModuleMainCommand,
})
export class ModuleDebugCommand extends DebugCommand {
  async run() {
    console.info('module is debug in', this.args.baseDir);
  }
}
