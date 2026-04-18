#!/usr/bin/env node

import { Command } from 'commander';
import { LSMSDK } from './sdk';

const pkg = require('../package.json');

const program = new Command();

program
  .name('lsm-cli')
  .description('Label-SQL Mapping CLI - Query database with natural language or SQL')
  .version(pkg.version)
  .option('-c, --config <name>', 'main.yaml: lsm-* package name (default: auto find)')
  .option('-l, --lsm <path>', 'lsm.yaml path (default: auto find upward)')
  .option('-q, --query <text>', 'Natural language query')
  .option('-s, --sql <sql>', 'Raw SQL query')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-ps, --page-size <number>', 'Page size', '20')
  .option('--json', 'Output raw JSON');

program.parse();

const opts = program.opts();

// 如果没传 -c，默认使用 'lsm'（会自动查找任意 lsm-* 包）
const configPath = opts.config || 'lsm';

async function main() {
  const sdk = await LSMSDK.fromAppConfig(configPath, opts.lsm);
  const result = await sdk.query({
    query: opts.query,
    sql: opts.sql,
    page: parseInt(opts.page),
    pageSize: parseInt(opts.pageSize)
  });

  if (opts.json) {
    console.log(JSON.stringify(result));
  } else {
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
