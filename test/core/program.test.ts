import { ArtusApplication } from '@artus/core';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { start, Program } from '@artus-cli/artus-cli';
import { CommandTrigger } from '../../src/core/trigger';
import path from 'node:path';
import assert from 'node:assert';

describe('program.test.ts', () => {
  let app: ArtusApplication;
  let program: Program;
  before(async () => {
    app = await start({ baseDir: path.dirname(require.resolve('egg-bin')) });
    program = app.container.get(Program);
  });

  after(() => app.close());

  it('base props', async () => {
    assert(program.baseDir.endsWith('egg-bin'));
    assert(program.name === 'egg-bin');
    assert(program.binName === 'egg-bin');
    assert(program.version === '1.0.0');
    assert(program.rootCommand.clz === MainCommand);
    assert(program.commands.size);
  });

  it('middlewares', async () => {
    const callStack: string[] = [];
    program.use(async (_ctx, next) => {
      callStack.push('pipeline');
      await next();
    });

    program.useInCommand(DevCommand, async (_ctx, next) => {
      callStack.push('command');
      await next();
    });

    program.useInExecution(DevCommand, async (_ctx, next) => {
      callStack.push('execution');
      await next();
    });

    const trigger = app.container.get(CommandTrigger);
    await trigger.execute({ argv: [ 'dev' ] });
    assert.deepEqual(callStack, [ 'pipeline', 'command', 'execution' ]);

    callStack.length = 0;
    await trigger.execute({ argv: [ 'debug' ] });
    assert.deepEqual(callStack, [ 'pipeline', 'command' ]);

    callStack.length = 0;
    await trigger.execute({ argv: [] });
    assert.deepEqual(callStack, [ 'pipeline' ]);
  });
});
