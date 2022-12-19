import { ArtusApplication } from '@artus/core';
import { checkCommandCompatible, isInheritFrom, isNil, readPkg, getCalleeDir, getCalleeFile } from '../src/utils';
import { DevCommand, DebugCommand, MainCommand } from 'egg-bin';
import { ParsedCommands, Command } from '@artus-cli/artus-cli';
import path from 'node:path';
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
    assert(checkCommandCompatible(parsedCommands.getCommand(DevCommand)!, parsedCommands.getCommand(DebugCommand)!));
    assert(!checkCommandCompatible(parsedCommands.getCommand(DebugCommand)!, parsedCommands.getCommand(DevCommand)!));
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

  it('readPkg', async () => {
    assert(await readPkg(path.resolve(__dirname, './fixtures/deep-bin/src')));
    assert(await readPkg(path.resolve(__dirname, './fixtures/chair-bin')));
    assert(await readPkg(path.resolve(__dirname, './fixtures/egg-bin')));
  });

  it('getCalleeFile/getCalleeDir', async () => {
    assert(getCalleeFile(1) === __filename);
    assert(getCalleeDir(1) === __dirname);
    assert(getCalleeFile(2)?.includes('mocha'));
    assert(getCalleeDir(2)?.includes('mocha'));
  });
});
