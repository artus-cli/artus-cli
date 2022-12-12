import { ArtusApplication } from '@artus/core';
import { createApp } from '../test-utils';
import { DefineCommand, DefineOption, Middleware } from '@artus-cli/artus-cli';
import { MetadataEnum } from '../../src/constant';
import assert from 'node:assert';

describe('decorators.test.ts', () => {
  let app: ArtusApplication;

  @DefineCommand({ command: 'dev', description: '666' })
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
    assert(metadata2.description);

    // override
    DefineCommand({ command: 'aa' })(NewMyCommand);
    const metadata3 = Reflect.getOwnMetadata(MetadataEnum.COMMAND, NewMyCommand);
    assert(metadata3.command === 'aa');
    assert(!metadata3.description);
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

    // override
    DefineOption({})(new NewMyCommand(), 'argv');
    const metadata3 = Reflect.getOwnMetadata(MetadataEnum.OPTION, NewMyCommand);
    assert(!metadata3.meta.port);
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

    // should works with merge type
    const beforeMiddlewareFn = async () => {};
    Middleware(beforeMiddlewareFn, { mergeType: 'before' })(NewMyCommand);
    const commandMiddleware3 = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, NewMyCommand);
    assert(commandMiddleware3.length === 3);
    assert(commandMiddleware3[0] === beforeMiddlewareFn);

    // should override
    const overrideMiddlewareFn = async () => {};
    Middleware(overrideMiddlewareFn, { override: true })(NewMyCommand);
    const commandMiddleware4 = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, NewMyCommand);
    assert(commandMiddleware4.length === 1);
    assert(commandMiddleware4[0] === overrideMiddlewareFn);
  });
});
