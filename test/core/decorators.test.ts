import { ArtusApplication } from '@artus/core';
import { createApp } from '../test-utils';
import { DefineCommand, DefineOption, Middleware } from '@artus-cli/artus-cli';
import { MetadataEnum } from '../../src/constant';
import assert from 'node:assert';

describe('decorators.test.ts', () => {
  let app: ArtusApplication;

  @DefineCommand({ command: 'dev' })
  @Middleware(async () => {})
  class MyCommand {
    @DefineOption({
      port: {},
    })
    options: any;

    @Middleware(async () => {})
    async run() {
      // nothing
    }
  }

  @DefineCommand()
  @Middleware(async () => {})
  class NewMyCommand extends MyCommand {
    @DefineOption()
    argv: any;

    async run() {
      // nothing
    }
  }

  before(async () => {
    app = await createApp('egg-bin');
  });

  after(() => app.close());

  it('DefineCommand', async () => {
    const metadata = Reflect.getOwnMetadata(MetadataEnum.COMMAND, MyCommand);
    assert(metadata.command === 'dev');

    const metadata2 = Reflect.getOwnMetadata(MetadataEnum.COMMAND, NewMyCommand);
    assert(metadata2.command === 'dev');
  });

  it('DefineOption', async () => {
    const metadata = Reflect.getOwnMetadata(MetadataEnum.OPTION, MyCommand);
    assert(metadata.key === 'options');
    assert(metadata.meta.port);
    assert('options' in MyCommand.prototype);

    // extend
    const metadata2 = Reflect.getOwnMetadata(MetadataEnum.OPTION, NewMyCommand);
    assert(metadata2.key === 'argv');
    assert(metadata2.meta.port);
    assert('argv' in NewMyCommand.prototype);
  });

  it('Middlware', async () => {
    const commandMiddleware = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, MyCommand);
    assert(commandMiddleware.length === 1);

    const executionMiddleware = Reflect.getOwnMetadata(MetadataEnum.RUN_MIDDLEWARE, MyCommand);
    assert(executionMiddleware.length === 1);

    // extend command middlewares
    const commandMiddleware2 = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, NewMyCommand);
    assert(commandMiddleware2.length === 2);

    // run method should not extend
    const executionMiddleware2 = Reflect.getOwnMetadata(MetadataEnum.RUN_MIDDLEWARE, NewMyCommand);
    assert(!executionMiddleware2);

    // should throw with other method
    assert.throws(() => {
      Middleware(async () => {})(new NewMyCommand(), 'other' as any);
    }, /Middleware can only be used in Command Class or run method/);
  });
});