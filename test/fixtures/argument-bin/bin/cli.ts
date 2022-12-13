#!/usr/bin/env node

import { start } from '@artus-cli/artus-cli';
import path from 'path';

start({ baseDir: path.dirname(__dirname) });
