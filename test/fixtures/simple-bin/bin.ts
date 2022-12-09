#!/usr/bin/env node

import '../common.js';
import { start } from 'artus-cli';
import { dirname } from 'dirname-filename-esm';

start({ baseDir: dirname(import.meta) });
