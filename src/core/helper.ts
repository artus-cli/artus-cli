import { Inject, Injectable, ScopeEnum } from '@artus/core';
import { ParsedCommands } from '../proto/ParsedCommands.js';
import { Command } from '../proto/Command.js';
import { CommandContext } from '../proto/CommandContext.js';
import { CommandTrigger } from './trigger.js';
import { EXCUTION_SYMBOL } from '../constant.js';
import assert from 'node:assert';
import { format } from 'node:util';

@Injectable({ scope: ScopeEnum.EXECUTION })
export class Helper {
  @Inject()
  private readonly ctx: CommandContext;

  @Inject()
  private readonly trigger: CommandTrigger;

  @Inject()
  private readonly commands: ParsedCommands;

  /** executing other command in same pipeline */
  async forward<T extends Record<string, any> = Record<string, any>>(clz: typeof Command, args?: T) {
    const cmd = this.commands.getCommand(clz);
    assert(cmd, format('Can not forward to command %s', clz.name));
    const instance = this.ctx.container.get(cmd.clz);
    if (args) instance[cmd.optionsKey] = args;
    return instance[EXCUTION_SYMBOL]();
  }

  /** create new pipeline to execute */
  async redirect(argv: string[]) {
    await this.trigger.execute({ argv });
  }
}
