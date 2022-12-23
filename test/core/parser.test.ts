import { parseArgvToArgs, parseArgvWithPositional, parseCommand, parseArgvKeySimple } from '../../src/core/parser';
import assert from 'node:assert';

describe('test/core/parser.test.ts', () => {
  it('parseCommand', async () => {
    const r = parseCommand('dev <command> [baseDir]', 'my-bin');
    assert(r.cmd === 'dev');
    assert.deepEqual(r.cmds, [ 'my-bin', 'dev' ]);
    assert(r.demanded.length === 1);
    assert(r.demanded[0].cmd === 'command');
    assert(r.optional.length === 1);
    assert(r.optional[0].cmd === 'baseDir');
    assert(r.command === 'dev <command> [baseDir]');

    const r2 = parseCommand('dev <command..>', 'my-bin');
    assert(r2.demanded.length === 1);
    assert(r2.demanded[0].variadic);

    const r3 = parseCommand('dev', 'my-bin');
    assert(r3.optional.length === 0);
    assert(r3.demanded.length === 0);

    const r4 = parseCommand('$0 dev', 'my-bin');
    assert.deepEqual(r4.cmds, [ 'my-bin', 'dev' ]);
  });

  it('parseArgvKeySimple', async () => {
    const r = parseArgvKeySimple('dev --a-bb -b --c-aa=123 -a 123123');
    assert(r.length === 4);
    assert.deepEqual(r[0], { raw: '--a-bb', parsed: 'aBb' });
    assert.deepEqual(r[1], { raw: '-b', parsed: 'b' });
    assert.deepEqual(r[2], { raw: '--c-aa', parsed: 'cAa' });
    assert.deepEqual(r[3], { raw: '-a', parsed: 'a' });
  });

  it('parseArgvToArgs', async () => {
    const r = parseArgvToArgs('dev --port 123 --inspect --daemon --no-debug', {
      optionConfig: {
        port: { type: 'number' },
        inspect: { type: 'boolean' },
        daemon: { type: 'boolean' },
      },
    });
    assert(r.argv.port === 123);
    assert(r.argv.inspect === true);
    assert(r.argv.daemon === true);
    assert(r.argv.debug === false);

    const r2 = parseArgvToArgs('dev -c 666 -i', {
      optionConfig: {
        port: { type: 'number', alias: [ 'p', 'c' ] },
        inspect: { type: 'boolean', alias: [ 'i' ] },
        daemon: { type: 'boolean', default: true },
      },
    });
    assert(r2.argv.port === 666);
    assert(r2.argv.inspect === true);
    assert(r2.argv.daemon === true);

    const r3 = parseArgvToArgs('dev -c 666 -i -- --bcd --efg', {
      optionConfig: {
        port: { type: 'number', alias: [ 'p', 'c' ] },
        inspect: { type: 'boolean', alias: [ 'i' ] },
        daemon: { type: 'boolean', default: true },
      },
    });
    assert(r3.argv.port === 666);
    assert.deepEqual(r3.argv['--'], [ '--bcd', '--efg' ]);
  });

  it('parseArgvToArgs with unknown option', () => {
    assert.throws(() => {
      parseArgvToArgs('dev --port 123 --inspect --daemon --no-debug -c 666 --bbb=123', {
        strictOptions: true,
        optionConfig: {
          port: { type: 'number' },
          inspect: { type: 'boolean' },
          daemon: { type: 'boolean' },
        },
      });
    }, /Unknown options: --no-debug, -c, --bbb/);

    assert.throws(() => {
      parseArgvToArgs('dev --port 123 --inspect --daemon --no-debug -c 666 -bbb=123', {
        strictOptions: true,
        optionConfig: {
          port: { type: 'number' },
          inspect: { type: 'boolean' },
          daemon: { type: 'boolean' },
        },
      });
    }, /Unknown options: --no-debug, -c, -bbb/);

    assert.throws(() => {
      parseArgvToArgs('dev --port 123 -c - -bbb=123 -- --aaa --bbb --ccc', {
        strictOptions: true,
        optionConfig: {
          port: { type: 'number' },
          inspect: { type: 'boolean' },
          daemon: { type: 'boolean' },
        },
      });
    }, /Unknown options: -c, -bbb/);
  });

  it('parseArgvWithPositional', () => {
    const parsed = parseCommand('dev <command> [baseDir]', 'my-bin');
    const r = parseArgvWithPositional([ 'module', './' ], parsed.demanded);
    assert(!r.unmatchPositionals.length);
    assert.deepEqual(r.unknownArgv, [ './' ]);
    assert(r.result.command === 'module');

    const r2 = parseArgvWithPositional([ './' ], parsed.optional);
    assert.deepEqual(r2.unknownArgv, []);
    assert(r2.result.baseDir === './');

    // variadic demanded
    const parsed2 = parseCommand('dev <command..>', 'my-bin');
    const r3 = parseArgvWithPositional([ 'module', 'module2', 'module3' ], parsed2.demanded);
    assert.deepEqual(r3.result.command, [ 'module', 'module2', 'module3' ]);

    // varidic optional
    const parsed3 = parseCommand('dev [command..]', 'my-bin');
    const r4 = parseArgvWithPositional([ 'module', 'module2', 'module3' ], parsed3.optional);
    assert.deepEqual(r4.result.command, [ 'module', 'module2', 'module3' ]);

    // not enough arguments
    const parsed4 = parseCommand('dev <option1> <option2> <option3>', 'my-bin');
    const r5 = parseArgvWithPositional([ 'module', 'module2' ], parsed4.demanded);
    assert(r5.result.option1 == 'module');
    assert(r5.result.option2 == 'module2');
    assert(r5.unmatchPositionals.length);

    // convert type
    const parsed5 = parseCommand('dev <option1> <option2>', 'my-bin');
    const r6 = parseArgvWithPositional([ '11', '22' ], parsed5.demanded, {
      option1: { type: 'number' },
      option2: { type: 'string' },
    });
    assert(r6.result.option1 == 11);
    assert(r6.result.option2 == '22');
  });
});
