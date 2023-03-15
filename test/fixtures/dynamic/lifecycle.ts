import { Program } from '@artus-cli/artus-cli';
import { ArgumentDevComand, ArgumentDebugComand } from './';
import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';

@LifecycleHookUnit()
export default class Lifecycle implements ApplicationLifecycle {
  @Inject()
  private program: Program;

  @LifecycleHook()
  async configDidLoad() {
    if (process.env.ENABLE_DEV) {
      this.program.enableCommand(ArgumentDevComand);
    }
    if (process.env.DISABLE_DEBUG) {
      this.program.disableCommand(ArgumentDebugComand);
    }
  }
}
