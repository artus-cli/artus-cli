import { ArtusApplication } from '@artus/core';
import { createApp } from '../test-utils';
import { CommandMeta, DefineCommand, DefineOption, Middleware, MiddlewareMeta, OptionMeta } from '@artus-cli/artus-cli';
import { MetadataEnum } from '../../src/constant';
import assert from 'node:assert';

describe('test/core/decorators.test.ts', () => {
  let app: ArtusApplication;

  @DefineCommand({ command: 'dev', description: '666' })
  @Middleware(async () => 1)
  class MyCommand {
    @DefineOption({
      port: {},
    })
    options: any;

    @Middleware(async () => 1)
    @Middleware(async () => 1)
    @Middleware(async () => 1)
    async run() {
      // nothing
    }
  }

  @DefineCommand()
  @Middleware([ async () => 1, async () => 1 ])
  class NewMyCommand extends MyCommand {
    @DefineOption()
    argv: any;

    async run() {
      // nothing
    }
  }

  @DefineCommand({ command: 'aa' }, { override: true })
  class OverrideMyCommand extends MyCommand {
    @DefineOption({}, { override: true })
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
    const metadata: CommandMeta = Reflect.getOwnMetadata(MetadataEnum.COMMAND, MyCommand);
    assert(metadata.config.command === 'dev');
    assert(metadata.location === __filename);

    const metadata2: CommandMeta = Reflect.getOwnMetadata(MetadataEnum.COMMAND, NewMyCommand);
    assert(!metadata2.config.command);
    assert(!metadata2.config.description);

    // override
    const metadata3: CommandMeta = Reflect.getOwnMetadata(MetadataEnum.COMMAND, OverrideMyCommand);
    assert(metadata3.config.command === 'aa');
    assert(metadata3.override);
  });

  it('DefineOption', async () => {
    const metadata: OptionMeta = Reflect.getOwnMetadata(MetadataEnum.OPTION, MyCommand);
    assert(metadata.key === 'options');
    assert(metadata.config.port);
    assert('options' in MyCommand.prototype);

    // extend
    const metadata2: OptionMeta = Reflect.getOwnMetadata(MetadataEnum.OPTION, NewMyCommand);
    assert(metadata2.key === 'argv');
    assert('argv' in NewMyCommand.prototype);

    // override
    const metadata3: OptionMeta = Reflect.getOwnMetadata(MetadataEnum.OPTION, OverrideMyCommand);
    assert(metadata3.override);
  });

  it('Middlware', async () => {
    const commandMiddleware: MiddlewareMeta = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, MyCommand);
    assert(commandMiddleware.configList.length === 1);
    assert(typeof commandMiddleware.configList[0].middleware === 'function');

    const executionMiddleware: MiddlewareMeta = Reflect.getOwnMetadata(MetadataEnum.RUN_MIDDLEWARE, MyCommand);
    assert(executionMiddleware.configList.length === 3);
    assert(executionMiddleware.configList.every(m => typeof m.middleware === 'function'));

    const commandMiddleware2: MiddlewareMeta = Reflect.getOwnMetadata(MetadataEnum.MIDDLEWARE, NewMyCommand);
    assert(commandMiddleware2.configList.length === 1);
    assert(Array.isArray(commandMiddleware2.configList[0].middleware));
    assert(commandMiddleware2.configList[0].middleware.length === 2);

    // should throw with other method
    assert.throws(() => {
      Middleware(async () => 1)(new NewMyCommand(), 'other' as any);
    }, /Middleware can only be used in Command Class or run method/);

    // should throw with multiple override
    assert.throws(() => {
      Middleware(async () => 1, { override: true })(NewMyCommand);
      Middleware(async () => 1, { override: false })(NewMyCommand);
    }, /Can\'t use override in multiple @Middleware/);
  });
});
