import { ArtusApplication } from '@artus/core';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { ArgumentMainComand } from 'argument-bin';
import { ParsedCommandTree, DefineCommand, DefineOption, Middleware, ParsedCommands, Program } from '@artus-cli/artus-cli';
import { createApp } from '../test-utils';
import assert from 'node:assert';
import path from 'node:path';

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
      assert(result4.error?.message.includes('Unknown commands'));

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

    const result2 = parsedCommands.matchCommand('debug -c --aaa');
    assert(result2.matched === parsedCommands.getCommand(DebugCommand));
    assert(result2.error?.message.includes('Unknown options'));
  });

  it('match command with strictOptions=false', async () => {
    app = await createApp('chair-bin', { strictOptions: false });
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('debug bbc ./');
    assert(!result.matched);
    assert(result.error?.message.includes('Unknown commands'));

    const result2 = parsedCommands.matchCommand('debug -c --aaa');
    assert(result2.matched === parsedCommands.getCommand(DebugCommand));
    assert(!result2.error);
  });

  it('should not match empty command', async () => {
    app = await createApp('chair-bin');
    parsedCommands = app.container.get(ParsedCommands);

    const result = parsedCommands.matchCommand('oneapi');
    assert(result.error!.message === 'Command not found');
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

  it('should parsed tree works without error', async () => {
    const beforeFn = async () => 1;
    const afterFn = async () => 1;

    @DefineCommand({ command: 'dev [baseDir]', description: '666' })
    @Middleware(async () => 1)
    class MyCommand {
      @DefineOption({
        port: {},
        inspectPort: { default: 8080 },
        baseDir: {},
      })
      options: any;
    
      @Middleware(async () => 1)
      @Middleware(async () => 1)
      @Middleware(async () => 1)
      async run() {
        // nothing
      }
    }
    
    @DefineCommand()
    @Middleware([ async () => 1, afterFn ])
    @Middleware([ beforeFn ], { mergeType: 'before' })
    class NewMyCommand extends MyCommand {
      @DefineOption({
        inspectPort: { default: 6666 },
      })
      argv: any;
    
      async run() {
        // nothing
      }
    }

    function NewDefineCommand(...args: any[]) {
      return DefineCommand(...args);
    }

    @NewDefineCommand({ command: 'aa' }, { inheritMetadata: false })
    @Middleware([ async () => 1, async () => 1 ], { inheritMetadata: false })
    class OverrideMyCommand extends MyCommand {
      @DefineOption({}, { inheritMetadata: false })
      argv: any;
    
      async run() {
        // nothing
      }
    }

    @DefineCommand({ command: 'aa' })
    class ConflicMyCommand extends MyCommand {
      async run() {
        // nothing
      }
    }

    @DefineCommand({ command: 'aa' }, { overrideCommand: true })
    class NotConflicMyCommand extends MyCommand {
      async run() {
        // nothing
      }
    }
  
    const tree = new ParsedCommandTree('my-bin', [ MyCommand, NewMyCommand, OverrideMyCommand ]);
    const parsedMyCommand = tree.get(MyCommand)!;
    assert(parsedMyCommand.location === __filename);
    assert(parsedMyCommand.uid === 'my-bin dev');
    assert(parsedMyCommand.clz === MyCommand);
    assert(parsedMyCommand.cmd === 'dev');
    assert(parsedMyCommand.flagOptions.port);
    assert(parsedMyCommand.flagOptions.inspectPort.default === 8080);
    assert(!parsedMyCommand.flagOptions.baseDir);
    assert(parsedMyCommand.argumentOptions.baseDir);
    assert(parsedMyCommand.description === '666');
    assert(parsedMyCommand.commandMiddlewares.length === 1);
    assert(parsedMyCommand.executionMiddlewares.length === 3);

    const parsedNewMyCommand = tree.get(NewMyCommand)!;
    assert(parsedNewMyCommand.location === __filename);
    assert(parsedNewMyCommand.clz === NewMyCommand);
    assert(parsedNewMyCommand.uid === 'my-bin dev');
    assert(parsedNewMyCommand.description === '666');
    assert(parsedNewMyCommand.flagOptions.port);
    assert(parsedNewMyCommand.flagOptions.inspectPort.default === 6666);
    assert(parsedNewMyCommand.argumentOptions.baseDir);
    assert(parsedNewMyCommand.commandMiddlewares.length === 4);
    assert(parsedNewMyCommand.commandMiddlewares[0] === beforeFn);
    assert(parsedNewMyCommand.commandMiddlewares[3] === afterFn);
    assert(!parsedNewMyCommand.executionMiddlewares.length);

    const parsedOverrideMyCommand = tree.get(OverrideMyCommand)!;
    assert(parsedOverrideMyCommand.location === __filename);
    assert(parsedOverrideMyCommand.clz === OverrideMyCommand);
    assert(parsedOverrideMyCommand.uid === 'my-bin aa');
    assert(!parsedOverrideMyCommand.description);
    assert(parsedOverrideMyCommand.commandMiddlewares.length === 2);
    assert(!parsedOverrideMyCommand.executionMiddlewares.length);

    // should conflict
    assert.throws(() => {
      new ParsedCommandTree('my-bin', [ MyCommand, NewMyCommand, OverrideMyCommand, ConflicMyCommand ]);
    }, (e: Error) => {
      assert(e.message.includes('Command \'aa\' is conflict in OverrideMyCommand('));
      assert(e.message.includes('parsed_commands.test.ts'));
      assert(e.message.includes('ConflicMyCommand('));
      return true;
    });

    // should not confict
    const tree2 = new ParsedCommandTree('my-bin', [ MyCommand, NewMyCommand, OverrideMyCommand, NotConflicMyCommand ]);
    const notConflictCommand = tree2.commands.get('my-bin aa');
    assert(tree2.commands.size === 3);
    assert(notConflictCommand?.clz === NotConflicMyCommand);
  });
});
