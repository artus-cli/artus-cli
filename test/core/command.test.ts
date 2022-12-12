import { Command, EmptyCommand } from '@artus-cli/artus-cli';
import assert from 'node:assert';

describe('test/core/command.test.ts', () => {
  it('should work', async () => {
    assert(Command);
    assert(EmptyCommand);
  });
});
