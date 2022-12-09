export enum MetadataEnum {
  COMMAND = 'COMMAND_METADATA',
  OPTION = 'OPTION_METADATA',
  MIDDLEWARE = 'MIDDLEWARE_METADATA',
  RUN_MIDDLEWARE = 'RUN_MIDDLEWARE_METADATA'
}

export const CONTEXT_SYMBOL = Symbol('Command#Context');
export const EXCUTION_SYMBOL = Symbol('Command#Excution');
