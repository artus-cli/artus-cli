import { Injectable, ScopeEnum } from '@artus-cli/artus-cli';

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
