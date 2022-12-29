import { Injectable } from '@artus/core';

export abstract class Command {
  abstract run(...args: any[]): Promise<any>;
}

@Injectable()
export class EmptyCommand extends Command {
  async run() {
    // nothing
  }
}
