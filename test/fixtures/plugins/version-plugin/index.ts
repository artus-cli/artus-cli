import '../../common';
import { Inject, ArtusInjectEnum, ApplicationLifecycle, LifecycleHook, LifecycleHookUnit } from '@artus/core';
import { Program, CommandContext, CommonBinConfig } from '@artus-cli/artus-cli';
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
      const { args, bin } = ctx;
      if (args.version) {
        // app config
        const config: CommonBinConfig = ctx.container.get(ArtusInjectEnum.Config);

        // read version from package.json
        const pkgPath = path.resolve(config.baseDir, './package.json');
        const pkgInfo = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        return console.info(bin, pkgInfo.version || '1.0.0');
      }

      await next();
    });
  }
}
