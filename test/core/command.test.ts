import { Command, EmptyCommand } from '@artus-cli/artus-cli';
import assert from 'node:assert';

describe('command.test.ts', () => {
  it('should work', async () => {
    assert(Command);
    assert(EmptyCommand);
  });
});
