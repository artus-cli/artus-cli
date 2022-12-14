import { ArtusApplication } from '@artus/core';
import { ParsedCommands } from '@artus-cli/artus-cli';
import { CommandTrigger } from '../../src/core/trigger';
import { BinInfo } from '../../src';
import { createApp } from '../test-utils';
import assert from 'node:assert';
import { DebugCommand } from 'egg-bin';

describe('test/core/trigger.test.ts', () => {
  let app: ArtusApplication;
  let trigger: CommandTrigger;
  let binInfo: BinInfo;
  before(async () => {
    app = await createApp('egg-bin');
    trigger = app.container.get(CommandTrigger);
    binInfo = app.container.get(BinInfo);
  });

  after(() => app.close());

  it('initContext', async () => {
    const ctx = await trigger.initContext({
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
    trigger.use(async (_ctx, next) => {
      executePipeline = true;
      await next();
    });

    await trigger.executePipeline({
      argv: [ 'dev' ],
      cwd: binInfo.baseDir,
      env: process.env,
    });

    assert(executePipeline);
  });

  it('executeCommand', async () => {
    const ctx = await trigger.initContext({
      params: {
        argv: [ 'dev' ],
        cwd: binInfo.baseDir,
        env: process.env,
      },
    });

    ctx.init();
    const parsedCommands = ctx.container.get(ParsedCommands);
    const { result } = await trigger.executeCommand(ctx, parsedCommands.getCommand(DebugCommand)!);
    assert(result);
    assert(result.command === 'debug');
  });
});
