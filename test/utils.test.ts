import { ArtusApplication } from '@artus/core';
import { checkCommandCompatible, isInheritFrom, isNil } from '../src/utils';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { ParsedCommands, Command } from '@artus-cli/artus-cli';
import { createApp } from './test-utils';
import assert from 'node:assert';

describe('test/utils.test.ts', () => {
  let app: ArtusApplication;
  before(async () => {
    app = await createApp('egg-bin');
  });

  after(() => app.close());

  it('checkCommandCompatible', async () => {
    const parsedCommands = app.container.get(ParsedCommands);
    assert(checkCommandCompatible(parsedCommands.getCommand(DevCommand), parsedCommands.getCommand(DebugCommand)));
    assert(!checkCommandCompatible(parsedCommands.getCommand(DebugCommand), parsedCommands.getCommand(DevCommand)));
  });

  it('isInheritFrom', async () => {
    assert(isInheritFrom(DevCommand, Command));
    assert(isInheritFrom(DebugCommand, DevCommand));
    assert(isInheritFrom(MainCommand, Command));
    assert(!isInheritFrom(Command, DevCommand));
  });

  it('isNil', async () => {
    assert(!isNil(true));
    assert(!isNil(1));
    assert(isNil(undefined));
    assert(isNil(null));
  });
});
