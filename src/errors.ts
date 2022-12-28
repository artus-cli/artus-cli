import { format } from 'node:util';

export enum ErrorCode {
  UNKNOWN_OPTIONS = 'UNKNOWN_OPTIONS',
  REQUIRED_OPTIONS = 'REQUIRED_OPTIONS',
  NOT_ENOUGH_ARGUMENTS = 'NOT_ENOUGH_ARGUMENTS',
  COMMAND_IS_NOT_FOUND = 'COMMAND_IS_NOT_FOUND',
  COMMAND_IS_NOT_IMPLEMENT = 'COMMAND_IS_NOT_IMPLEMENT',
  COMMAND_IS_CONFLICT = 'COMMAND_IS_CONFLICT',
  UNKNOWN = 'UNKNOWN',
}

export class ArtusCliError extends Error {
  code: ErrorCode;

  static create(code: ErrorCode, message: string, ...args: any[]) {
    const err = new ArtusCliError(format(message, ...args));
    err.code = code;
    return err;
  }
}

const c = ArtusCliError.create;
export const errors = {
  unknown_options(options: string[]) {
    return c(ErrorCode.UNKNOWN_OPTIONS, 'Unknown options: %s', options.join(', '));
  },

  required_options(options: string[]) {
    return c(ErrorCode.REQUIRED_OPTIONS, 'Required options: %s', options.join(', '));
  },

  not_enough_argumnents(requiredArgv: string[]) {
    return c(ErrorCode.NOT_ENOUGH_ARGUMENTS, 'Not enough arguments, %s is required', requiredArgv.join(', '));
  },

  command_is_not_found(commandInfo: string) {
    return c(ErrorCode.COMMAND_IS_NOT_FOUND, 'Command is not found: \'%s\'', commandInfo);
  },
  
  command_is_not_implement(commandInfo: string) {
    return c(ErrorCode.COMMAND_IS_NOT_IMPLEMENT, 'Command is not implement: \'%s\'', commandInfo);
  },

  command_is_conflict(command: string, existsCommandName: string, existsCommandLocation: string | undefined, conflictCommandName: string, conflictCommandLocation: string | undefined) {
    return c(ErrorCode.COMMAND_IS_CONFLICT, 'Command \'%s\' is conflict in %s(%s) and %s(%s)', command, existsCommandName, existsCommandLocation || '-', conflictCommandName, conflictCommandLocation || '-');
  },

  unknown(message: string) {
    return c(ErrorCode.UNKNOWN, message);
  },
};
