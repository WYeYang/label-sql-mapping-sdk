// SDK 快速开始示例
// 运行: cd examples && npx ts-node quick-start.ts

import { LSMSDK } from '../src';

async function quickStart() {
  console.log('🚀 SDK 快速开始\n');

  // 1. 创建 SDK 实例
  const sdk = new LSMSDK();

  // -----------------------------------------------------------
  // 示例 1: 配置访问
  // -----------------------------------------------------------
  console.log('📋 示例 1: 配置访问\n');

  const config = sdk.getLabelsConfig();
  console.log('配置名称:', config.name);
  console.log('配置ID:', config.id);
  console.log('数据库类型:', config.database.type);

  const dbPath = sdk.getDatabasePath();
  console.log('数据库路径:', dbPath);

  const mappings = sdk.getLabelMappings();
  console.log('标签映射数量:', mappings.length);
  console.log('标签映射列表:');
  mappings.forEach(m => {
    const type = m.items ? '标签值筛选' : m.range ? '数值类型' : '普通字段';
    console.log(`  - ${m.id} (${m.name}): ${type}`);
  });

  // -----------------------------------------------------------
  // 示例 2: 自然语言查询
  // -----------------------------------------------------------
  console.log('\n🤖 示例 2: 自然语言查询\n');

  const result = await sdk.query({
    query: '攻击力大于2500的暗属性怪兽',
    page: 1,
    pageSize: 5
  });

  console.log('查询结果:');
  console.log(`  总数: ${result.total}`);
  console.log(`  页码: ${result.page}/${result.totalPages}`);
  console.log(`  SQL: ${result.sql}`);
  console.log(`  说明: ${result.explanation}`);
  console.log(`  返回数据: ${result.data.length} 条`);

  if (result.data.length > 0) {
    console.log('  第一条数据:');
    console.log('   ', result.data[0]);
  }

  // -----------------------------------------------------------
  // 示例 3: id+values 筛选
  // -----------------------------------------------------------
  console.log('\n🎯 示例 3: id+values 筛选\n');

  const filterResult = await sdk.query({
    extensions: [
      { id: 'attribute', values: ['光'] },
      { id: 'level', values: ['>=8'] }
    ],
    page: 1,
    pageSize: 3
  });

  console.log('筛选结果:');
  console.log(`  总数: ${filterResult.total}`);
  console.log(`  SQL: ${filterResult.sql}`);
  console.log(`  返回数据: ${filterResult.data.length} 条`);

  console.log('\n✅ 示例完成!');
}

quickStart().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
