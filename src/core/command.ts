export abstract class Command {
  abstract run(...args: any[]): Promise<any>;
}

export class EmptyCommand extends Command {
  async run() {
    // nothing
  }
}
