import { fork } from './test-utils';

describe('test/index.test.ts', () => {
  it('egg-bin should work', async () => {
    await fork('egg-bin', [ '--help' ])
      .debug()
      .expect('stdout', /Usage: egg-bin/)
      .end();

    await fork('egg-bin', [ 'dev', '123', '-p=6000' ])
      .debug()
      .expect('stdout', /port 6000/)
      .expect('stdout', /egg-bin dev command prerun/)
      .expect('stdout', /egg-bin dev command postrun/)
      .expect('stdout', /inspect false/)
      .expect('stdout', /nodeFlags undefined/)
      .expect('stdout', /baseDir 123/)
      .end();

    await fork('egg-bin', [ '-v' ])
      .debug()
      .expect('stdout', /1.0.0/)
      .end();

    await fork('egg-bin', [ 'test', './', 'file1', 'file2' ])
      .debug()
      .expect('stdout', /test command middleware 1\ntest command middleware 2\ntest command middleware 3/)
      .expect('stdout', /test baseDir .\//)
      .expect('stdout', /test files \[ 'file1', 'file2' \]/)
      .end();

    await fork('egg-bin', [ 'cov', './', 'file1', 'file2', '--c8=true' ])
      .debug()
      .expect('stdout', /coverage c8 true/)
      .expect('stdout', /test command middleware 1\ntest command middleware 2\ntest command middleware 3/)
      .expect('stdout', /test baseDir .\//)
      .expect('stdout', /test files \[ 'file1', 'file2' \]/)
      .end();
  });

  it('egg-bin should work with different env', async () => {
    await fork('egg-bin', [ '--help' ], {
      env: { ...process.env, ARTUS_CLI_ENV: 'prod' },
    })
      .debug()
      .expect('stderr', /Unknown options: --help/)
      .end();
  });

  it('chair-bin should work', async () => {
    await fork('chair-bin', [ '--help' ])
      .debug()
      .expect('stdout', /Usage: chair-bin/)
      .end();

    await fork('chair-bin', [ 'dev', '123', '-p=6000' ])
      .debug()
      .expect('stdout', /port 6000/)
      .expect('stdout', /egg-bin dev command prerun\nchair-bin dev command prerun/)
      .expect('stdout', /chair-bin dev command postrun\negg-bin dev command postrun/)
      .expect('stdout', /inspect false/)
      .expect('stdout', /nodeFlags undefined/)
      .expect('stdout', /baseDir 123/)
      .end();

    await fork('chair-bin', [ 'codegen' ])
      .debug()
      .expect('stdout', /run codegen in codegen plugin/)
      .end();

    await fork('chair-bin', [ 'cg' ])
      .debug()
      .expect('stdout', /run codegen in codegen plugin/)
      .end();

    await fork('chair-bin', [ 'cg', 'ex' ])
      .debug()
      .expect('stdout', /run extra codegen in codegen extra/)
      .end();

    await fork('chair-bin', [ 'module', 'dev', './' ])
      .debug()
      .expect('stdout', /chair-bin dev command prerun/)
      .expect('stdout', /module is dev in .\//)
      .end();

    await fork('chair-bin', [ 'oneapi', 'client', 'app' ])
      .debug()
      .expect('stdout', /oneapi client app/)
      .end();

    await fork('chair-bin', [ 'oneapi' ])
      .debug()
      .expect('stderr', /Command not found: 'chair-bin oneapi'/)
      .end();

    await fork('chair-bin', [ 'user', '-u=123' ])
      .debug()
      .expect('stdout', /user is foo/)
      .end();
  });

  it('simple-bin should work', async () => {
    await fork('simple-bin', [ '--help' ])
      .debug()
      .expect('stdout', /Usage: simple-bin \[baseDir\]/)
      .expect('stdout', /-p, --port/)
      .expect('stdout', /-h, --help/)
      .end();

    await fork('simple-bin', [ './src', '--port', '7001' ])
      .debug()
      .expect('stdout', /Run with port 7001 in \.\/src/)
      .end();
  });

  it('override-bin should work', async () => {
    await fork('override', [ 'dev' ])
      .debug()
      .expect('stdout', /extractly override/)
      .end();
  });

  it('argument-bin should work', async () => {
    await fork('argument-bin', [ '666', '--inspect' ])
      .debug()
      .expect('stdout', /serv in port 666/)
      .expect('stdout', /serv is inspecting.../)
      .end();

    await fork('argument-bin', [ '-h' ])
      .debug()
      .expect('stdout', /--inspect/)
      .notExpect('stdout', /--port/)
      .end();

    await fork('argument-bin', [ 'debug', '-h' ])
      .debug()
      .notExpect('stdout', /--base-dir/)
      .end();
  });

  it('deep-bin should work', async () => {
    await fork('deep-bin', [ '--help' ])
      .debug()
      .expect('stdout', /Usage: deep-bin \[baseDir\]/)
      .expect('stdout', /-p, --port number/)
      .end();
  });
});
