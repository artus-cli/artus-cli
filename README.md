# artus-cli

POC of command line base on artusjs


## 默认 demo

```bash
$ npx ts-node test/fixtures/egg-bin/bin/cli.ts -h
```

## 继承 demo

继承 egg-bin 并且增添指令的 demo

```bash
$ npx ts-node test/fixtures/chair-bin/bin/cli.ts -h
```

## 简单 demo

```bash
$ npx ts-node test/fixtures/simple-bin/bin/cli.ts -h
```

## 指令覆盖 demo

用于验证指令覆盖

```bash
$ npx ts-node test/fixtures/override/bin/cli.ts -h
```

## 插件 demo

- test/fixtures/plugin-help: `-h, --help`
- test/fixtures/plugin-version: `-v, --version`
- test/fixtures/plugin-codegen `codegen 指令`
- test/fixtures/plugin-codegen-extra `拓展 codegen 指令`

## 单测

```
$ npm run test
```

