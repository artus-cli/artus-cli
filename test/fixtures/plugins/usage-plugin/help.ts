import { DefineCommand, Command, DefineOption, Inject, CommandContext } from 'artus-cli';
import commandLineUsage from 'command-line-usage';

interface Option {
  command: string;
}

@DefineCommand({
  command: 'help [command]',
  description: 'show help infomation for command',
  alias: 'h',
})
export class HelpCommand extends Command {
  @Inject()
  ctx: CommandContext;

  @DefineOption()
  option: Option;

  async run() {
    const ctx = this.ctx;
    const { command } = this.option;
    const helpCommand = ctx.commands.get(command) || ctx.rootCommand;

    // display help informations
    const displayTexts = [];
    const commandLineUsageList = [];
    const optionKeys = helpCommand.options ? Object.keys(helpCommand.options) : [];

    // usage info in first line
    displayTexts.push(`Usage: ${helpCommand.command.startsWith(ctx.bin) ? '' : `${ctx.bin} `}${helpCommand.command}`);
    if (helpCommand.description) {
      displayTexts.push('', helpCommand.description);
    }

    // available commands, display all subcommands if match the root command
    const availableCommands = (
      helpCommand.isRoot
        ? Array.from(new Set(ctx.commands.values()))
        : [ helpCommand ].concat(helpCommand.childs || [])
    ).filter(c => !c.isRoot && c.isRunable);

    if (availableCommands.length) {
      commandLineUsageList.push({
        header: 'Available Commands',
        content: availableCommands.map(command => ({
          name: command.command,
          summary: command.description,
        })),
      });
    }

    // options list, like -h, --help / -v, --version ...
    commandLineUsageList.push({
      header: 'Options',
      optionList: optionKeys
        .map(flag => {
          const option = helpCommand.options[flag];
          const showFlag = flag[0].toLowerCase() + flag.substring(1).replace(/[A-Z]/g, '-$&').toLowerCase();
          return {
            name: showFlag,
            type: { name: option.type },
            description: option.description,
            alias: option.alias,
            defaultValue: option.default,
          };
        }),
    });

    // use command-line-usage to format help informations.
    displayTexts.push(commandLineUsage(commandLineUsageList));
    console.info(displayTexts.join('\n'));
  }
}
