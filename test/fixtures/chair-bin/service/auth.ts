import { Injectable, ScopeEnum } from '@artus-cli/artus-cli';
import inquirer from 'inquirer';

@Injectable({
  scope: ScopeEnum.EXECUTION,
})
export class AuthService {
  async auth() {
    const result = await inquirer.prompt([{
      name: 'password',
      message: 'please input your password',
    }]);

    return result.password;
  }
}
