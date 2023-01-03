import { Injectable } from '@artus/core';
import { COMMAND_OPTION_SYMBOL } from '../constant';

export abstract class Command {
  /** Non-option arguments */
  get _() {
    return this[COMMAND_OPTION_SYMBOL]._;
  }

  /** Arguments after the end-of-options flag `--` */
  get '--'() {
    return this[COMMAND_OPTION_SYMBOL]['--'];
  }

  abstract run(...args: any[]): Promise<any>;
}

@Injectable()
export class EmptyCommand extends Command {
  async run() {
    // nothing
  }
}
