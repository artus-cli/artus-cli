# @artus-cli/artus-cli

![artus-cli](https://socialify.git.ci/artus-cli/artus-cli/image?description=1&descriptionEditable=__________%20%20CLI%20framework%20with%20modern%20features%20%20__________%20%20%20%20%20%20%20%20%20%20%20%20%20%20%F0%9F%92%AA%20Powerful%20%2B%20%F0%9F%9A%80%20Modern%20%2B%20%F0%9F%8E%A2%20Customizable&font=Source%20Code%20Pro&language=1&name=1&owner=1&pattern=Circuit%20Board&theme=Dark)

[![NPM version](https://img.shields.io/npm/v/@artus-cli/artus-cli.svg?style=flat-square)](https://npmjs.org/package/@artus-cli/artus-cli)
[![NPM quality](https://img.shields.io/npms-io/final-score/@artus-cli/artus-cli.svg?style=flat-square)](https://npmjs.org/package/@artus-cli/artus-cli)
[![NPM download](https://img.shields.io/npm/dm/@artus-cli/artus-cli.svg?style=flat-square)](https://npmjs.org/package/@artus-cli/artus-cli)
[![Continuous Integration](https://github.com/artus-cli/artus-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/artus-cli/artus-cli/actions/workflows/ci.yml)
[![Test coverage](https://img.shields.io/codecov/c/github/artus-cli/artus-cli.svg?style=flat-square)](https://codecov.io/gh/artus-cli/artus-cli)
[![Oss Insight Analytics](https://img.shields.io/badge/OssInsight-artus--cli%2Fartus--cli-blue.svg?style=flat-square)](https://ossinsight.io/analyze/artus-cli/artus-cli)

`artus-cli` aims to provide a modern command-line-apps framework.

- **Powerful**, powered by [artusjs](https://github.com/artusjs).
- **Modern**, TypeScript and IoC ready.
- **Customizable**, command inheritance, and support Plugin and Framework (wrap it as a upper layer CLI).
- **Community**, enjoy the eco-friendliness, use the same plugin with your artusjs web apps.


## How it looks

```ts
import { DefineCommand, Option, Command } from '@artus-cli/artus-cli';

@DefineCommand({
  command: 'dev',
  description: 'Run the development server',
  alias: [ 'd' ],
})
export class DevCommand extends Command {
  @Option({
    alias: 'p',
    default: 3000,
    description: 'server port',
  })
  port: number;

  async run() {
    console.info('port: %s', this.port);
  }
}
```

Run it with:

```bash
$ my-cli dev --port 8080
```


## Document

https://artus-cli.github.io

