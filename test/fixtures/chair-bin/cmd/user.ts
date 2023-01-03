import { Inject, DefineCommand, Option, Command, CommandContext, Middleware } from '@artus-cli/artus-cli';
import { UserService } from '../service/user';
import { AuthService } from '../service/auth';

async function authMiddleware(ctx: CommandContext, next) {
  const authService = ctx.container.get(AuthService);
  const authCode = '123';
  if (ctx.args.authCode !== authCode) {
    const inputCode = await authService.auth();
    if (inputCode !== authCode) {
      console.error('Error: invalid user!');
      process.exit(1);
    }
  }

  await next();
}

@DefineCommand({
  command: 'user',
  description: 'Show User Info',
})
@Middleware(authMiddleware)
export class ChairUserCommand extends Command {
  @Option({ alias: 'u' })
  authCode: string;

  @Inject()
  userService: UserService;

  async run() {
    const user = await this.userService.getUserInfo();
    console.info('user is', user.nickname);
  }
}
