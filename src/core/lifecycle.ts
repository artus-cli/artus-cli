import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import CommandPipeline from './pipeline';

@LifecycleHookUnit()
export default class Lifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly pipeline: CommandPipeline;

  @LifecycleHook()
  async didReady() {
    await this.pipeline.start();
  }
}
