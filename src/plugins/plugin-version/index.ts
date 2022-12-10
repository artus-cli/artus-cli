import { Inject, ArtusInjectEnum, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import { Program, CommandContext, CommonBinConfig } from '../../';
import fs from 'fs/promises';
import path from 'path';

@LifecycleHookUnit()
export default class VersionLifecycle implements ApplicationLifecycle {
  @Inject()
  private readonly program: Program;

  @LifecycleHook()
  async configDidLoad() {
    const { rootCommand } = this.program;
    this.program.option({
      version: {
        type: 'boolean',
        alias: 'v',
        description: 'Show Version',
      },
    }, [ rootCommand ]);

    // intercept root command and show version
    this.program.useInCommand(rootCommand, async (ctx: CommandContext, next) => {
      const { args } = ctx;
      if (args.version) {
        return console.info(this.program.binName, this.program.version || '1.0.0');
      }

      await next();
    });
  }
}
