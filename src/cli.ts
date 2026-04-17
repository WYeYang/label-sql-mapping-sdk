#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { LSMSDK } from './sdk';

const pkg = require('../package.json');

const program = new Command();

program
  .name('lsm-cli')
  .description('Label-SQL Mapping CLI - Query database with natural language or SQL')
  .version(pkg.version)
  .requiredOption('-c, --config <path>', 'Path to LSM config YAML file')
  .option('-l, --lsm <path>', 'Path to LSM app config (default: same as -c)')
  .option('-q, --query <text>', 'Natural language query')
  .option('-s, --sql <sql>', 'Raw SQL query')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-ps, --page-size <number>', 'Page size', '20')
  .option('--json', 'Output raw JSON');

program.parse();

const opts = program.opts();

// lsmConfigPath: 数据库配置
const lsmConfigPath = path.resolve(opts.config);
// appConfigPath: LLM配置，没传时与lsmConfigPath相同
const appConfigPath = opts.lsm ? path.resolve(opts.lsm) : lsmConfigPath;

async function main() {
  const sdk = await LSMSDK.fromAppConfig(appConfigPath, lsmConfigPath);
  const result = await sdk.query({
    query: opts.query,
    sql: opts.sql,
    page: parseInt(opts.page),
    pageSize: parseInt(opts.pageSize)
  });

  if (opts.json) {
    console.log(JSON.stringify(result));
  } else {
    // 简洁输出
    console.log(`Total: ${result.total} | Page ${result.page}/${result.totalPages}`);
    console.log(`SQL: ${result.sql}`);
    if (result.explanation) {
      console.log(`Explanation: ${result.explanation}`);
    }
    console.log('\nData:');
    console.log(JSON.stringify(result.data, null, 2));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
