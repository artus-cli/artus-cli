import { ParsedCommand, Positional } from './core/parsed_commands';

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

export function isNil(v) {
  return v === undefined || v === null;
}
