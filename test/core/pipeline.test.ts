import { ArtusApplication } from '@artus/core';
import { ParsedCommands } from '@artus-cli/artus-cli';
import CommandPipeline from '../../src/core/pipeline';

import { BinInfo } from '../../src';
import { createApp } from '../test-utils';
import assert from 'node:assert';
import { DebugCommand } from 'egg-bin';

describe('test/core/pipeline.test.ts', () => {
  let app: ArtusApplication;
  let pipeline: CommandPipeline;
  let binInfo: BinInfo;
  before(async () => {
    app = await createApp('egg-bin');
    pipeline = app.container.get(CommandPipeline);
    binInfo = app.container.get(BinInfo);
  });

  after(() => app.close());

  it('initContext', async () => {
    const ctx = await pipeline.initContext({
      params: {
        argv: [ 'dev' ],
        cwd: binInfo.baseDir,
        env: process.env,
      },
    });

    ctx.init();
    assert(ctx.args);
    assert(ctx.args.port === 3000);
    assert(ctx.env);
    assert(ctx.cwd);
  });

  it('executePipeline', async () => {
    let executePipeline = false;
    pipeline.use(async (_ctx, next) => {
      executePipeline = true;
      await next();
    });

    await pipeline.executePipeline({
      argv: [ 'dev' ],
      cwd: binInfo.baseDir,
      env: process.env,
    });

    assert(executePipeline);
  });

  it('executeCommand', async () => {
    const ctx = await pipeline.initContext({
      params: {
        argv: [ 'dev' ],
        cwd: binInfo.baseDir,
        env: process.env,
      },
    });

    ctx.init();
    const parsedCommands = ctx.container.get(ParsedCommands);
    const { result } = await pipeline.executeCommand(ctx, parsedCommands.getCommand(DebugCommand)!);
    assert(result);
    assert(result.command === 'debug');
  });
});
