import coffee from 'coffee';
import path from 'path';

describe('test', () => {
  const tsNode = path.resolve(__dirname, '../node_modules/.bin/ts-node');
  const eggBin = path.resolve(__dirname, './fixtures/egg-bin/bin.ts');
  const chairBin = path.resolve(__dirname, './fixtures/chair-bin/bin.ts');
  const simpleBin = path.resolve(__dirname, './fixtures/simple-bin/bin.ts');
  const overrideBin = path.resolve(__dirname, './fixtures/override/bin.ts');

  it('egg-bin should work', async () => {
    await coffee.fork(tsNode, [ eggBin, '--help' ])
      .debug()
      .expect('stdout', /Usage: egg-bin/)
      .expect('stdout', /Available Commands/)
      .expect('stdout', /dev \[baseDir\]              Run the development server/)
      .expect('stdout', /test <baseDir> \[file...\]/)
      .expect('stdout', /Options/)
      .expect('stdout', /-h, --help       Show Help/)
      .expect('stdout', /-v, --version    Show Version/)
      .end();

    await coffee.fork(tsNode, [ eggBin, 'dev', '123', '-p=6000' ])
      .debug()
      .expect('stdout', /port 6000/)
      .expect('stdout', /egg-bin dev command prerun/)
      .expect('stdout', /egg-bin dev command postrun/)
      .expect('stdout', /inspect false/)
      .expect('stdout', /nodeFlags undefined/)
      .expect('stdout', /baseDir 123/)
      .end();

    await coffee.fork(tsNode, [ eggBin, '-v' ])
      .debug()
      .expect('stdout', /1.0.0/)
      .end();

    await coffee.fork(tsNode, [ eggBin, 'dev', '-h' ])
      .debug()
      .expect('stdout', /Run the development server/)
      .expect('stdout', /dev \[baseDir\]   Run the development server/)
      .expect('stdout', /-p, --port number     Start A Server/)
      .expect('stdout', /--inspect             Debug with node-inspector/)
      .end();

    await coffee.fork(tsNode, [ eggBin, 'test', './', 'file1', 'file2' ])
      .debug()
      .expect('stdout', /test command middleware 1\ntest command middleware 2\ntest command middleware 3/)
      .expect('stdout', /test baseDir .\//)
      .expect('stdout', /test files \[ 'file1', 'file2' \]/)
      .end();

    await coffee.fork(tsNode, [ eggBin, 'cov', './', 'file1', 'file2', '--c8=true' ])
      .debug()
      .expect('stdout', /coverage c8 true/)
      .expect('stdout', /test command middleware 1\ntest command middleware 2\ntest command middleware 3/)
      .expect('stdout', /test baseDir .\//)
      .expect('stdout', /test files \[ 'file1', 'file2' \]/)
      .end();
  });

  it('chair-bin should work', async () => {
    await coffee.fork(tsNode, [ chairBin, '--help' ])
      .debug()
      .expect('stdout', /Usage: chair-bin/)
      .expect('stdout', /Available Commands/)
      .expect('stdout', /dev \[baseDir\]              Run the development server with chair-bin/)
      .expect('stdout', /test <baseDir> \[file...\]   Run the unitest/)
      .expect('stdout', /codegen                    codegen plugin/)
      .expect('stdout', /codegen extra              codegen extra plugin/)
      .expect('stdout', /module                     Module Commands/)
      .expect('stdout', /module debug \[baseDir\]     Module Debug Commands/)
      .expect('stdout', /module dev \[baseDir\]       Module Dev Commands/)
      .expect('stdout', /oneapi client \[appName\]    Run the oneapi client/)
      .expect('stdout', /oneapi server \[appName\]    Run the oneapi server/)
      .expect('stdout', /Options/)
      .expect('stdout', /-h, --help       Show Help/)
      .expect('stdout', /-v, --version    Show Version/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'dev', '123', '-p=6000' ])
      .debug()
      .expect('stdout', /port 6000/)
      .expect('stdout', /egg-bin dev command prerun\nchair-bin dev command prerun/)
      .expect('stdout', /chair-bin dev command postrun\negg-bin dev command postrun/)
      .expect('stdout', /inspect false/)
      .expect('stdout', /nodeFlags undefined/)
      .expect('stdout', /baseDir 123/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'codegen' ])
      .debug()
      .expect('stdout', /run codegen in codegen plugin/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'cg' ])
      .debug()
      .expect('stdout', /run codegen in codegen plugin/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'cg', 'ex' ])
      .debug()
      .expect('stdout', /run extra codegen in codegen extra/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'module', 'dev', './' ])
      .debug()
      .notExpect('stdout', /chair-bin dev command prerun/)
      .expect('stdout', /module is dev in .\//)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'oneapi', 'client', 'app' ])
      .debug()
      .expect('stdout', /oneapi client app/)
      .end();

    await coffee.fork(tsNode, [ chairBin, 'user', '-u=123' ])
      .debug()
      .expect('stdout', /user is foo/)
      .end();
  });

  it('simple-bin should work', async () => {
    await coffee.fork(tsNode, [ simpleBin, '--help' ])
      .debug()
      .expect('stdout', /Usage: simple-bin \[baseDir\]/)
      .expect('stdout', /-p, --port number   port/)
      .expect('stdout', /-h, --help          Show Help/)
      .end();

    await coffee.fork(tsNode, [ simpleBin, './src', '--port', '7001' ])
      .debug()
      .expect('stdout', /Run with port 7001 in \.\/src/)
      .end();
  });

  it('override-bin should work', async () => {
    await coffee.fork(tsNode, [ overrideBin, 'dev' ])
      .debug()
      .expect('stdout', /extractly override/)
      .end();
  });
});
