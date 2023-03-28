import { ArtusApplication } from '@artus/core';
import { ParsedCommandTree, DefineCommand, Options, Middleware, Command } from '@artus-cli/artus-cli';
import { createApp } from '../test-utils';
import assert from 'node:assert';

describe('test/core/parsed_command_tree.test.ts', () => {
  let app: ArtusApplication;
 
  afterEach(() => app && app.close());

  it('should parsed tree works without error', async () => {
    const beforeFn = async () => 1;
    const afterFn = async () => 1;

    @DefineCommand({
      command: 'dev [baseDir]',
      description: '666',
      examples: [
        'my-bin dev ./',
        [ '$0 dev ./' ],
        [ '$0 dev ./', 'this is desc' ],
      ],
    })
    @Middleware(async () => 1)
    class MyCommand extends Command {
      @Options({
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
      @Options({
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
  
    app = await createApp('argument-bin');
    const tree = app.container.get(ParsedCommandTree);

    tree.build([ MyCommand, NewMyCommand, OverrideMyCommand ]);
    const parsedMyCommand = tree.get(MyCommand)!;
    assert(parsedMyCommand.location === __filename);
    assert(parsedMyCommand.examples.length === 3);
    assert(parsedMyCommand.examples[0].command === 'my-bin dev ./');
    assert(parsedMyCommand.examples[1].command === 'argument-bin dev ./');
    assert(parsedMyCommand.examples[2].command === 'argument-bin dev ./');
    assert(parsedMyCommand.examples[2].description === 'this is desc');
    assert(parsedMyCommand.uid === 'argument-bin dev');
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
    assert(parsedNewMyCommand.uid === 'argument-bin dev');
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
    assert(parsedOverrideMyCommand.uid === 'argument-bin aa');
    assert(!parsedOverrideMyCommand.description);
    assert(parsedOverrideMyCommand.commandMiddlewares.length === 2);
    assert(!parsedOverrideMyCommand.executionMiddlewares.length);

    // should conflict
    assert.throws(() => {
      tree.build([ MyCommand, NewMyCommand, OverrideMyCommand, ConflicMyCommand ]);
    }, (e: Error) => {
      assert(e.message.includes('Command \'aa\' is conflict in OverrideMyCommand('));
      assert(e.message.includes('parsed_command_tree.test.ts'));
      assert(e.message.includes('ConflicMyCommand('));
      return true;
    });

    // should not confict
    tree.build([ MyCommand, NewMyCommand, OverrideMyCommand, NotConflicMyCommand ]);
    const notConflictCommand = tree.commands.get('argument-bin aa');
    assert(tree.commands.size === 3);
    assert(notConflictCommand?.clz === NotConflicMyCommand);
  });
});
