import { Inject, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import { CommandTrigger } from './trigger.js';

@LifecycleHookUnit()
export default class Lifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly trigger: CommandTrigger;

  @LifecycleHook()
  async configDidLoad() {
    await this.trigger.init();
  }

  @LifecycleHook()
  async didReady() {
    await this.trigger.start();
  }
}
