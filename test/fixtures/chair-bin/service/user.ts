import { Injectable, ScopeEnum } from '@artus-cli/artus-cli';
import inquirer from 'inquirer';

@Injectable({
  scope: ScopeEnum.EXECUTION,
})
export class UserService {
  async getUserInfo() {
    return {
      nickname: 'foo',
    };
  }
}
