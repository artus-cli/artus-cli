import { ParsedCommand } from './core/parsed_commands';
import { Positional } from './core/parser';
import pkgUp from 'pkg-up';
import path from 'node:path';
import assert from 'node:assert';

export function isInheritFrom(clz, maybeParent) {
  if (clz === maybeParent) return true;
  let curr = clz;
  while (curr) {
    if (curr === maybeParent) return true;
    curr = Object.getPrototypeOf(curr);
  }
  return false;
}

export function checkCommandCompatible(command: ParsedCommand, compareCommand: ParsedCommand) {
  // check option
  for (const key in command.options) {
    const item = command.options[key];
    const compareItem = compareCommand.options[key];
    if (!compareItem) return false;
    if (item.type !== compareItem.type) return false;
  }

  // check demanded/optional
  const flattern = (pos: Positional[]) => pos.map(d => d.cmd).join(' ');
  if (flattern(command.demanded) !== flattern(compareCommand.demanded)) return false;
  if (flattern(command.optional) !== flattern(compareCommand.optional)) return false;

  return true;
}

export function isNil(v): v is undefined | null {
  return v === undefined || v === null;
}

export function convertValue<T extends string | string[]>(val: T, type: string) {
  if (Array.isArray(val)) return val.map(v => convertValue(v, type));
  switch(type) {
    case 'number': return +val;
    case 'boolean': return val === 'false' ? false : !!val;
    default: return val;
  }
}

export async function readPkg(baseDir: string) {
  const pkgPath = await pkgUp({ cwd: baseDir });
  assert(pkgPath, `Can not find package.json in ${baseDir}`);
  return {
    pkgPath,
    pkgInfo: require(pkgPath),
  };
}

export function getCalleeList(traceLimit: number) {
  const limit = Error.stackTraceLimit;
  const prep = Error.prepareStackTrace;

  Error.prepareStackTrace = prepareObjectStackTrace;
  Error.stackTraceLimit = traceLimit;

  const obj: any = {};
  Error.captureStackTrace(obj);
  const stack: any[] = obj.stack;

  Error.prepareStackTrace = prep;
  Error.stackTraceLimit = limit;
  return stack.map(s => ({
    methodName: s.getMethodName(),
    fileName: s.getFileName(),
  }));
}

export function getCalleeDir(stackIndex: number): string | undefined {
  stackIndex++; // one more stack
  const calleeList = getCalleeList(stackIndex + 1);
  const calleeFile = calleeList[stackIndex]?.fileName;
  return calleeFile ? path.dirname(calleeFile) : undefined;
}

function prepareObjectStackTrace(_obj, stack) {
  return stack;
}
