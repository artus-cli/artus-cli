import { ArtusApplication } from '@artus/core';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { ArgumentMainComand } from 'argument-bin';
import { ErrorCode, ParsedCommands, Program, EmptyCommand } from '@artus-cli/artus-cli';
import { createApp } from '../test-utils';
import assert from 'node:assert';
import path from 'node:path';
import { TestCommand } from 'egg-bin/cmd/test';

describe('test/core/parsed_commands.test.ts', () => {
  let app: ArtusApplication;
  let parsedCommands: ParsedCommands;
 
  afterEach(() => app && app.close());

  describe('base usage', () => {
    beforeEach(async () => {
      app = await createApp('egg-bin');
      parsedCommands = app.container.get(ParsedCommands);
    });

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
      assert(devParsedCommand.location === path.resolve(__dirname, '../fixtures/egg-bin/cmd/dev.ts'));
      assert.deepEqual(devParsedCommand.cmds, [ 'egg-bin', 'dev' ]);
      assert.deepEqual(devParsedCommand.alias, [ 'd' ]);
    });

    it('parse argv', async () => {
      const devParsedCommand = parsedCommands.getCommand(DevCommand);
      const { args: result } = parsedCommands.parseArgs('dev -p 1234 --inspect', devParsedCommand);
      assert(result.port === 1234);
      assert(result.inspect === true);

      const { args: result2 } = parsedCommands.parseArgs([ 'dev' ], devParsedCommand);
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
      assert(result4.error?.message.includes('Command is not found'));

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
      assert(result6.error?.code === ErrorCode.REQUIRED_OPTIONS);
      assert(result6.error?.message.includes('Required options: requiredInfo'));

      const result7 = parsedCommands.matchCommand('dev ./ --required-info=123');
      assert(!result7.error);
    });
  });

  it('should get right location with extending command', async () => {
    app = await createApp('chair-bin', { strict: false });
    parsedCommands = app.container.get(ParsedCommands);

    const devCommand = parsedCommands.commands.get('chair-bin dev');
    assert(devCommand?.location === path.resolve(__dirname, '../fixtures/chair-bin/cmd/dev.ts'));
    assert(devCommand?.inherit?.location === path.resolve(__dirname, '../fixtures/egg-bin/cmd/dev.ts'));
  });

  it('match command with strict=false', async () => {
    app = await createApp('chair-bin', { strict: false });
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('debug bbc ./');
    assert(result.matched === parsedCommands.getCommand(DebugCommand));
    assert(!result.error);

    const result2 = parsedCommands.matchCommand('debug bbc ./ -c --aaa');
    assert(result2.matched === parsedCommands.getCommand(DebugCommand));
    assert(!result2.error);
  });

  it('match command with strictCommand=false', async () => {
    app = await createApp('chair-bin', { strictCommands: false });
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('debug bbc ./');
    assert(result.matched === parsedCommands.getCommand(DebugCommand));
    assert(!result.error);

    const result3 = parsedCommands.matchCommand('oneapi');
    assert(result3.matched!.clz === EmptyCommand);
    assert(!result3.error);

    const result2 = parsedCommands.matchCommand('debug -c --aaa');
    assert(result2.matched === parsedCommands.getCommand(DebugCommand));
    assert(result2.error?.code === ErrorCode.UNKNOWN_OPTIONS);
    assert(result2.error?.message.includes('Unknown options'));
  });

  it('match command with strictOptions=false', async () => {
    app = await createApp('chair-bin', { strictOptions: false });
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('debug bbc ./');
    assert(!result.matched);
    assert(result.error?.code === ErrorCode.COMMAND_IS_NOT_FOUND);
    assert(result.error?.message.includes('Command is not found'));

    const result2 = parsedCommands.matchCommand('debug -c --aaa');
    assert(result2.matched === parsedCommands.getCommand(DebugCommand));
    assert(!result2.error);

    const result3= parsedCommands.matchCommand('test');
    assert(result3.matched === parsedCommands.getCommand(TestCommand));
    assert(!result3.error);
  });

  it('should not match empty command', async () => {
    app = await createApp('chair-bin');
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('oneapi');
    assert(result.error?.code === ErrorCode.COMMAND_IS_NOT_IMPLEMENT);
    assert(result.error?.message.includes('Command is not implement: \'chair-bin oneapi\''));
  });

  it('should not match unknown command', async () => {
    app = await createApp('chair-bin');
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('bbc');
    assert(result.error?.code === ErrorCode.COMMAND_IS_NOT_FOUND);
    assert(result.error?.message.includes('Command is not found: \'chair-bin bbc\''));
  });

  it('should not match unknown arguments', async () => {
    app = await createApp('chair-bin');
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('test');
    assert(result.error?.code === ErrorCode.NOT_ENOUGH_ARGUMENTS);
    assert(result.error?.message.includes('Not enough arguments, baseDir is required'));
  });

  it('should parse argument options and match without error', async () => {
    app = await createApp('argument-bin');
    parsedCommands = app.container.get(ParsedCommands);
    const cmd = parsedCommands.getCommand(ArgumentMainComand);

    assert(cmd!.argumentOptions.port);
    assert(!cmd!.flagOptions.port);
    assert(!cmd!.options.port);

    // test match
    const result = parsedCommands.matchCommand('666 --inspect');
    assert(result.matched === cmd);
    assert(result.args.port === 666);
    assert(result.args.inspect === true);

    // test override
    const result2 = parsedCommands.matchCommand('666 --port=888 --inspect');
    assert(result2.matched === cmd);
    assert(result2.args.port === 666);
    assert(result2.args.inspect === true);
  });
});
