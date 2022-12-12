import { ArtusApplication } from '@artus/core';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { ParsedCommands, Program } from '@artus-cli/artus-cli';
import { createApp } from '../test-utils';
import assert from 'node:assert';

describe('parsed_commands.test.ts', () => {
  let app: ArtusApplication;
  let parsedCommands: ParsedCommands;
  before(async () => {
    app = await createApp('egg-bin');
    parsedCommands = app.container.get(ParsedCommands);
  });

  after(() => app.close());

  it('base usage', async () => {
    assert(parsedCommands.commands.size);
    assert(parsedCommands.root.clz === MainCommand);

    const devParsedCommand = parsedCommands.getCommand(DevCommand);
    assert(devParsedCommand);
    assert(parsedCommands.root.childs.includes(devParsedCommand));
    assert(devParsedCommand.clz === DevCommand);
    assert(devParsedCommand.cmd === 'dev');
    assert(devParsedCommand.uid === 'egg-bin dev');
    assert(devParsedCommand.parent === parsedCommands.root);
    assert.deepEqual(devParsedCommand.cmds, [ 'egg-bin', 'dev' ]);
    assert.deepEqual(devParsedCommand.alias, [ 'd' ]);
  });

  it('parse argv', async () => {
    const devParsedCommand = parsedCommands.getCommand(DevCommand);
    const result = parsedCommands.parseArgs('dev -p 1234 --inspect', devParsedCommand);
    assert(result.port === 1234);
    assert(result.inspect === true);

    const result2 = parsedCommands.parseArgs([ 'dev' ], devParsedCommand);
    assert(result2.port === 3000);
    assert(result2.inspect === false);
  });

  it('match command', async () => {
    const result = parsedCommands.matchCommand('dev -p 1234 --inspect');
    assert(result.matched === parsedCommands.getCommand(DevCommand));
    assert(result.args.port === 1234);
    assert(result.args.inspect === true);
    assert(result.args.baseDir === undefined);
    assert(!result.error);

    const result2 = parsedCommands.matchCommand('dev ./');
    assert(result2.matched === parsedCommands.getCommand(DevCommand));
    assert(result2.args.baseDir === './');
    assert(result2.args.port === 3000);
    assert(!result2.error);

    const result3 = parsedCommands.matchCommand('debug ./');
    assert(result3.matched === parsedCommands.getCommand(DebugCommand));
    assert(result3.args.baseDir === './');
    assert(result3.args.port === 3000);
    assert(!result3.error);

    const result4 = parsedCommands.matchCommand('debug bbc ./');
    assert(!result4.matched);
    assert(result4.fuzzyMatched === parsedCommands.getCommand(DebugCommand));
    assert(result4.error?.message.includes('Unknown arguments'));

    const result5 = parsedCommands.matchCommand('bbc ./');
    assert(!result5.matched);
    assert(result5.fuzzyMatched === parsedCommands.root);
    assert(result5.error);

    // required option
    app.container.get(Program).option({
      requiredInfo: {
        type: 'string',
        required: true,
      },
    });
    const result6 = parsedCommands.matchCommand('dev ./');
    assert(result6.error?.message.includes('Required options: requiredInfo'));

    const result7 = parsedCommands.matchCommand('dev ./ --required-info=123');
    assert(!result7.error);
  });
});
