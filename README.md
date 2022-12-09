# artus-cli

POC of command line base on artusjs


## 默认 demo

```bash
$ npx ts-node test/fixtures/egg-bin/bin.ts -h
```

## 继承 demo

继承 egg-bin 并且增添指令的 demo

```bash
$ npx ts-node test/fixtures/chair-bin/bin.ts -h
```

## 简单 demo

```bash
$ npx ts-node test/fixtures/simple-bin/bin.ts -h
```

## 指令覆盖 demo

用于验证指令覆盖

```bash
$ npx ts-node test/fixtures/override/bin.ts -h
```

## 插件 demo

- test/fixtures/usage-plugin: `-h, --help`
- test/fixtures/version-plugin: `-v, --version`
- test/fixtures/codegen-plugin `codegen 指令`
- test/fixtures/codegen-extra `拓展 codegen 指令`

## 单测

```
$ npm run test
```

