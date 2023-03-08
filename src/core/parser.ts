import parser from 'yargs-parser';
import { OptionConfig } from '../types';
import { isNil, convertValue } from '../utils';
import { flatten } from 'lodash';
import { ArtusCliError, errors } from '../errors';

export interface ParsedCommandStruct {
  uid: string;
  cmd: string;
  cmds: string[];
  command: string;
  demanded: Positional[];
  optional: Positional[];
}

export interface Positional {
  cmd: string;
  variadic: boolean;
}

/** convert argv to camelCase key simpliy */
export function parseArgvKeySimple(argv: string | string[]) {
  const list = flatten((Array.isArray(argv) ? argv : [ argv ]).map(arg => arg.split(/\s+/)));
  const newList: Array<{ raw: string; parsed: string }> = [];
  for (const arg of list) {
    if (arg === '--') break;
    if (!arg.match(/^\-+[^\-]/i)) continue;
    const raw = arg.split('=')[0];
    newList.push({ raw, parsed: parser.camelCase(raw.replace(/^\-{2}no\-/, '')) });
  }
  return newList;
}

/** parse argv to args, base on yargs-parser */
export function parseArgvToArgs(argv: string | string[], option: {
  strictOptions?: boolean;
  optionConfig?: OptionConfig;
} = {}) {
  const requiredOptions: string[] = [];
  const parserOption: parser.Options = {
    configuration: { "populate--": true },
  };

  if (option.optionConfig) {
    for (const key in option.optionConfig) {
      const opt = option.optionConfig[key];
      if (opt.required) requiredOptions.push(key);
      if (!isNil(opt.alias)) {
        parserOption.alias = parserOption.alias || {};
        parserOption.alias[key] = opt.alias;
      }

      if (!isNil(opt.type)) {
        parserOption[opt.type] = parserOption[opt.type] || [];
        parserOption[opt.type]!.push(key);
      }

      if (!isNil(opt.default)) {
        parserOption.default = parserOption.default || {};
        parserOption.default[key] = opt.default;
      }

      if (!isNil(opt.array)) {
        parserOption.array = parserOption.array || [];
        parserOption.array!.push(key as any);
      }
    }
  }

  const parseResult = parser.detailed(argv, parserOption);

  let error: ArtusCliError | undefined;
  const requiredNilOptions = requiredOptions.filter(k => isNil(parseResult.argv[k]));
  if (requiredNilOptions.length) {
    // check required option
    error = errors.required_options(requiredNilOptions);
  } else if (option.optionConfig && option.strictOptions) {
    // checking for strict options
    const argvs = parseArgvKeySimple(argv);
    const notSupportArgvs: Set<string> = new Set();
    Object.keys(parseResult.argv).forEach(key => {
      // _ and -- is built-in key
      if (key === '_' || key === '--') return;

      // checking with alias list
      const alias = (parseResult.aliases[key] || []).concat(key);
      if (alias.every(n => !notSupportArgvs.has(n) && !option.optionConfig![n])) {
        const flag = argvs.find(a => a.parsed === key || a.raw === key)?.raw;
        if (flag) notSupportArgvs.add(flag);
      }
    });

    // check unknown by yargs-parser
    argvs.forEach(a => {
      if (parseResult.argv[a.parsed] === undefined) notSupportArgvs.add(a.raw);
    });

    if (notSupportArgvs.size) {
      error = errors.unknown_options(Array.from(notSupportArgvs));
    }
  } else if (parseResult.error) {
    error = errors.unknown(parseResult.error.message);
  }

  return {
    args: parseResult.argv,
    error,
  };
}

/** parse `<options>` or `[option]` and collect args */
export function parseArgvWithPositional(argv: string[], pos: Positional[], options?: OptionConfig) {
  let nextIndex = pos.length;
  const result: Record<string, any> = {};
  const unmatchPositionals = pos.filter((positional, index) => {
    // `bin <files..>` match `bin file1 file2 file3` => { files: [ "file1", "file2", "file3" ] }
    // `bin <file> [baseDir]` match `bin file1 ./` => { file: "file1", baseDir: "./" }
    let r;
    if (positional.variadic) {
      r = argv.slice(index);
      nextIndex = argv.length; // variadic means the last
    } else {
      r = argv[index];
    }

    // check arguments option
    const argOpt = options? options[positional.cmd] : undefined;
    if (argOpt) {
      r = isNil(r) ? argOpt.default : r;
      if (argOpt.type) r = convertValue(r, argOpt.type);
    }

    result[positional.cmd] = r;
    return isNil(r);
  });

  return {
    result,
    unknownArgv: argv.slice(nextIndex),
    unmatchPositionals, 
  };
}

/** parse command string to struct */
export function parseCommand(cmd: string, binName: string) {
  const extraSpacesStrippedCommand = cmd.replace(/\s{2,}/g, ' ');
  const splitCommand = extraSpacesStrippedCommand.split(/\s+(?![^[]*]|[^<]*>)/);
  const bregex = /\.*[\][<>]\.*/g;
  if (!splitCommand.length) throw new Error(`No command found in: ${cmd}`);

  // first cmd is binName or $0, remove it anyway
  if ([ binName, '$0' ].includes(splitCommand[0])) {
    splitCommand.shift();
  }

  let command: string;
  if (!splitCommand[0] || splitCommand[0].match(bregex)) {
    command = [ binName, ...splitCommand ].join(' ');
  } else {
    command = splitCommand.join(' ');
  }

  const parsedCommand: ParsedCommandStruct = {
    uid: '',
    cmd: '',
    cmds: [ binName ],
    command,
    demanded: [],
    optional: [],
  };

  splitCommand.forEach((cmd, i) => {
    let variadic = false;
    cmd = cmd.replace(/\s/g, '');

    // <file...> or [file...]
    if (i === splitCommand.length - 1 && /(\.+[\]>])|([\[<]\.+)/.test(cmd)) variadic = true;

    const result = cmd.match(/^(\[|\<)/);
    if (result) {
      if (result[1] === '[') {
        // [options]
        parsedCommand.optional.push({ cmd: cmd.replace(bregex, ''), variadic });
      } else {
        // <options>
        parsedCommand.demanded.push({ cmd: cmd.replace(bregex, ''), variadic });
      }
    } else {
      // command without [] or <>
      parsedCommand.cmds.push(cmd);
    }
  });

  // last cmd is the command
  parsedCommand.cmd = parsedCommand.cmds[parsedCommand.cmds.length - 1];
  parsedCommand.uid = parsedCommand.cmds.join(' ');
  return parsedCommand;
}
