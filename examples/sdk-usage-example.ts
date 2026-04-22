// SDK 使用示例

import { LSMSDK } from '../src';

async function main() {
  console.log('=== SDK 使用示例 ===\n');

  // 1. 创建 SDK 实例
  console.log('1. 创建 SDK 实例...');
  const sdk = new LSMSDK();
  console.log('✓ SDK 实例创建成功\n');

  // 2. 配置访问方法示例
  console.log('2. 配置访问方法示例:');

  // 获取完整的 labels 配置
  const labelsConfig = sdk.getLabelsConfig();
  console.log('  - getLabelsConfig():', {
    name: labelsConfig.name,
    id: labelsConfig.id,
    version: labelsConfig.version,
    databaseType: labelsConfig.database.type
  });

  // 获取数据库配置
  const dbConfig = sdk.getDatabaseConfig();
  console.log('  - getDatabaseConfig():', {
    type: dbConfig.type,
    tablesCount: dbConfig.tables.length
  });

  // 获取数据库文件路径
  const dbPath = sdk.getDatabasePath();
  console.log('  - getDatabasePath():', dbPath);

  // 获取所有标签映射配置
  const labelMappings = sdk.getLabelMappings();
  console.log('  - getLabelMappings():', labelMappings.length, '个标签映射');
  labelMappings.slice(0, 3).forEach(m => {
    console.log(`    - ${m.id}: ${m.name}`);
  });

  // 获取所有扩展标签配置
  const extensions = sdk.getExtensions();
  console.log('  - getExtensions():', extensions.length, '个扩展标签');
  extensions.slice(0, 3).forEach(e => {
    console.log(`    - ${e.id}: ${e.name}`);
  });

  // 根据 ID 获取标签映射配置
  const priceMapping = sdk.getLabelMappingById('price');
  if (priceMapping) {
    console.log('  - getLabelMappingById("price"):', {
      id: priceMapping.id,
      name: priceMapping.name,
      hasRange: !!priceMapping.range
    });
  }

  // 根据 ID 获取扩展标签配置
  const brandExtension = sdk.getExtensionById('brand');
  if (brandExtension) {
    console.log('  - getExtensionById("brand"):', {
      id: brandExtension.id,
      name: brandExtension.name,
      itemsCount: brandExtension.items?.length || 0
    });
  }

  // 获取配置目录路径
  const configDir = sdk.getConfigDir();
  console.log('  - getConfigDir():', configDir);

  // 获取 labels.yaml 原始内容（前200字符）
  const labelsYaml = sdk.getLabelsYamlContent();
  console.log('  - getLabelsYamlContent():', labelsYaml.substring(0, 200) + '...');

  console.log('\n3. 查询示例:');

  // 3. 自然语言查询
  console.log('  - 自然语言查询: "攻击力大于2000的怪兽卡"');
  const result = await sdk.query({
    query: '攻击力大于2000的怪兽卡',
    page: 1,
    pageSize: 5
  });

  console.log('  - 查询结果:');
  console.log('    total:', result.total);
  console.log('    page:', result.page);
  console.log('    pageSize:', result.pageSize);
  console.log('    totalPages:', result.totalPages);
  console.log('    sql:', result.sql);
  console.log('    explanation:', result.explanation);
  console.log('    data.length:', result.data.length);
  console.log('    data (前2条):');
  result.data.slice(0, 2).forEach((item, index) => {
    console.log(`      ${index + 1}.`, item);
  });

  console.log('\n4. id+values 筛选示例:');

  // 4. id+values 筛选
  const filterResult = await sdk.query({
    extensions: [
      { id: 'attribute', values: ['暗'] },
      { id: 'level', values: ['>7'] }
    ],
    page: 1,
    pageSize: 3
  });

  console.log('  - 筛选结果:');
  console.log('    total:', filterResult.total);
  console.log('    sql:', filterResult.sql);
  console.log('    data.length:', filterResult.data.length);

  console.log('\n=== 示例完成 ===');
}

main().catch(console.error);
