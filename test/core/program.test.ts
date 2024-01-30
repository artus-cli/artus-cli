import { ArtusApplication } from '@artus/core';
import { DebugCommand, DevCommand, MainCommand } from 'egg-bin';
import { Program } from '@artus-cli/artus-cli';
import CommandPipeline from '../../src/core/pipeline';
import { createApp } from '../test-utils';
import assert from 'node:assert';

describe('test/core/program.test.ts', () => {
  let app: ArtusApplication;
  let program: Program;
  before(async () => {
    app = await createApp('egg-bin');
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

    program.useInCommand(DevCommand, async (_ctx, next) => {
      callStack.push('dev');
      await next();
    });

    program.useInCommand(DebugCommand, async (_ctx, next) => {
      callStack.push('debug');
      await next();
    });

    program.useInExecution(DevCommand, async (_ctx, next) => {
      callStack.push('execution');
      await next();
    });

    const pipeline = app.container.get(CommandPipeline);
    await pipeline.executePipeline({ argv: [ 'dev' ] });
    assert.deepEqual(callStack, [ 'pipeline', 'command', 'dev', 'execution' ]);

    callStack.length = 0;
    await pipeline.executePipeline({ argv: [ 'debug' ] });
    assert.deepEqual(callStack, [ 'pipeline', 'debug' ]);

    callStack.length = 0;
    await pipeline.executePipeline({ argv: [] });
    assert.deepEqual(callStack, [ 'pipeline' ]);
  });
});
