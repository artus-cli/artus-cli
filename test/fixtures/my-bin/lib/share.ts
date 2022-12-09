import { Injectable, ScopeEnum } from '@artus-cli/artus-cli';

@Injectable({ scope: ScopeEnum.SINGLETON })
export class ShareService {
  async run() {
    console.info('Run share service');
  }
}
