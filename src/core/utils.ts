import { Inject, Injectable, ScopeEnum } from '@artus/core';
import { ParsedCommand, ParsedCommands } from './parsed_commands';
import { Command } from './command';
import { CommandContext } from './context';
import { CommandTrigger } from './trigger';
import { EXCUTION_SYMBOL } from '../constant';
import assert from 'node:assert';
import { format } from 'node:util';

@Injectable({ scope: ScopeEnum.EXECUTION })
export class Utils {
  @Inject()
  private readonly ctx: CommandContext;

  @Inject()
  private readonly trigger: CommandTrigger;

  @Inject()
  private readonly commands: ParsedCommands;

  /** executing other command in same pipeline */
  async forward<T extends Record<string, any> = Record<string, any>>(clz: typeof Command | ParsedCommand, args?: T) {
    const cmd = clz instanceof ParsedCommand ? clz : this.commands.getCommand(clz);
    assert(cmd, format('Can not forward to command %s', cmd.clz.name));
    const instance = this.ctx.container.get(cmd.clz);
    if (args) instance[cmd.optionsKey] = args;
    return this.trigger.executeCommand(this.ctx, cmd);
  }

  /** create new pipeline to execute */
  async redirect(argv: string[]) {
    await this.trigger.executePipeline({ argv });
  }
}
