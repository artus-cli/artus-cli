import { ArtusApplication } from '@artus/core';
import { checkCommandCompatible, isInheritFrom, isNil, readPkg, getCalleeList, getCalleeDir, formatCmd, formatDesc } from '../src/utils';
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

  it('getCalleeList/getCalleeDir', async () => {
    assert(getCalleeList(3).length === 3);
    assert(getCalleeList(3)[0].fileName);
    assert.equal(getCalleeDir(1), __dirname);
    assert(getCalleeDir(2)?.includes('mocha'));
  });

  it('formatCommand', async () => {
    const obj = {
      $0: 'my-bin',
      bin: 'my-bin',
    };

    assert(formatCmd('$0 dev', obj), 'my-bin dev');
    assert(formatCmd(' $0 dev', obj), 'my-bin dev');
    assert(formatCmd(' $0', obj), 'my-bin');
    assert(formatCmd('other-bin', obj), 'other-bin');
    assert(formatCmd('{{ bin }}', obj), 'my-bin');
    assert(formatCmd('test {{ bin }}', obj), 'test my-bin');
  });

  it('formatDesc', async () => {
    const obj = {
      $0: 'my-bin',
      bin: 'my-bin',
    };

    assert(formatDesc('dev {{ $0 }}', obj), 'dev my-bin');
    assert(formatDesc('{{ bin }} dev', obj), 'my-bin dev');
  });
});
