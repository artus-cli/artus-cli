import { ArtusApplication } from '@artus/core';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { start, ParsedCommands, Utils, Program, CommandContext } from '@artus-cli/artus-cli';
import { CommandTrigger } from '../../src/core/trigger';
import path from 'node:path';
import { createApp, createCtx } from '../test-utils';
import assert, { deepEqual } from 'node:assert';

describe('core/utils.test.ts', () => {
  let app: ArtusApplication;
  let program: Program;
  let utils: Utils;
  before(async () => {
    app = await createApp('egg-bin');
    program = app.container.get(Program);
    const ctx = await createCtx(app, [ 'dev' ]);
    utils = ctx.container.get(Utils);
  });

  after(() => app.close());

  it('forward', async () => {
    let executePipeline = false;
    program.use(async (_ctx, next) => {
      executePipeline = true;
      await next();
    });

    const { result } = await utils.forward(DebugCommand);
    assert(result);
    assert(result.command === 'debug');
    assert(result.args.port === 3000);
    assert(!executePipeline);

    const { result: result2 } = await utils.forward(DebugCommand, { port: 666 });
    assert(result2.args.port === 666);
  });

  it('redirect', async () => {
    let executePipeline = false;
    program.use(async (_ctx, next) => {
      executePipeline = true;
      await next();
    });

    await utils.redirect([ 'debug' ]);
    assert(executePipeline);
  });
});
