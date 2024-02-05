import { Inject, Injectable, ScopeEnum } from '@artus/core';
import { ParsedCommands } from './parsed_commands';
import { ParsedCommand } from './parsed_command';
import { Command } from './command';
import { CommandContext } from './context';
import CommandPipeline from './pipeline';
import assert from 'node:assert';
import { format } from 'node:util';

@Injectable({ scope: ScopeEnum.EXECUTION })
export class Utils {
  @Inject()
  private readonly ctx: CommandContext;

  @Inject()
  private readonly pipeline: CommandPipeline;

  @Inject()
  private readonly commands: ParsedCommands;

  /** forward to other command in same pipeline */
  async forward<T extends Record<string, any> = Record<string, any>>(clz: typeof Command | ParsedCommand, args?: T) {
    const cmd = clz instanceof ParsedCommand ? clz : this.commands.getCommand(clz);
    assert(cmd, format('Can not forward to command %s', cmd?.clz.name));
    Object.assign(this.ctx.args, this.commands.parseArgs(this.ctx.raw, cmd).args, args);
    return this.pipeline.executeCommand(this.ctx, cmd);
  }

  /** create new pipeline to execute */
  async redirect(argv: string[]) {
    await this.pipeline.executePipeline({ argv });
  }
}
