import { Injectable } from '@artus/core';

export abstract class Command {
  /** Non-option arguments */
  '_': string[];

  /** Arguments after the end-of-options flag `--` */
  '--'?: string[];

  abstract run(...args: any[]): Promise<any>;
}

@Injectable()
export class EmptyCommand extends Command {
  async run() {
    throw new Error('should not call empty command');
  }
}
