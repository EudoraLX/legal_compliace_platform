# API Key 测试工具

这是一个用于测试 OpenRouter API Key 是否可用的工具，专门为法律合规分析系统设计。

## 功能特性

### 🔍 全面测试覆盖
- **API Key 配置检查**: 验证 API Key 是否正确设置和格式是否正确
- **API 连接性测试**: 测试与 OpenRouter 服务器的网络连接
- **API Key 有效性测试**: 验证 API Key 是否有效且能正常调用 AI 服务
- **模型可用性测试**: 检查目标 AI 模型是否可用
- **业务场景测试**: 模拟实际业务场景，测试 AI 分析功能

### 📊 详细测试报告
- 每个测试的详细结果和状态
- 失败原因的详细说明和解决建议
- 总体评估和操作建议
- 清晰的统计信息

### 🛠️ 智能错误处理
- 网络连接问题的详细诊断
- API 错误码的详细解释
- 超时和连接重置的处理
- 友好的错误提示信息

## 使用方法

### 方法1: 使用批处理文件（推荐）
1. 双击运行 `test-api.bat` 文件
2. 系统会自动检查依赖并运行测试
3. 查看测试结果和报告

### 方法2: 命令行运行
```bash
# 安装依赖（如果还没有安装）
npm install

# 运行测试
node test-api-key.js
```

### 方法3: 作为模块使用
```javascript
const APIKeyTester = require('./test-api-key.js');

async function testAPI() {
  const tester = new APIKeyTester();
  await tester.runAllTests();
}

testAPI();
```

## 测试项目说明

### 1. API Key 配置检查
- 检查环境变量中是否设置了 `OPENROUTER_API_KEY`
- 验证 API Key 格式是否正确（以 `sk-or-v1-` 开头）

### 2. API 连接性测试
- 测试与 `openrouter.ai` 的网络连接
- 检查 DNS 解析、网络可达性等

### 3. API Key 有效性测试
- 使用 API Key 调用 AI 服务
- 验证 API Key 的权限和有效性
- 测试基本的 AI 响应功能

### 4. 模型可用性测试
- 获取可用的 AI 模型列表
- 检查目标模型 `anthropic/claude-opus-4.1` 是否可用
- 显示其他可用的替代模型

### 5. 业务场景测试
- 模拟实际的合同分析场景
- 测试 AI 的法律合规分析功能
- 验证完整的业务流程

## 测试结果解读

### ✅ 通过 (PASSED)
- 测试项目完全正常
- 可以正常使用相关功能

### ⚠️ 警告 (WARNING)
- 测试项目基本正常，但有一些需要注意的问题
- 可能影响部分功能，但不影响基本使用

### ❌ 失败 (FAILED)
- 测试项目存在问题
- 需要解决相关问题才能正常使用

## 常见问题解决

### API Key 未设置
```
❌ API Key 未设置
```
**解决方案**: 在 `config.env` 文件中设置 `OPENROUTER_API_KEY`

### API Key 格式不正确
```
❌ API Key 格式不正确
```
**解决方案**: 确保 API Key 以 `sk-or-v1-` 开头

### API Key 无效或已过期
```
❌ API Key 无效或已过期
```
**解决方案**: 
1. 检查 API Key 是否正确复制
2. 确认 API Key 是否已过期
3. 在 OpenRouter 控制台重新生成 API Key

### 网络连接问题
```
❌ 连接被拒绝 / 域名解析失败 / 连接超时
```
**解决方案**:
1. 检查网络连接是否正常
2. 确认防火墙设置
3. 尝试使用 VPN 或代理

### 权限不足
```
❌ API Key 权限不足
```
**解决方案**: 检查 OpenRouter 账户的权限设置和模型访问权限

### 请求频率超限
```
❌ API 请求频率超限
```
**解决方案**: 等待一段时间后重试，或升级 OpenRouter 账户

## 环境要求

- **Node.js**: 版本 14.0.0 或更高
- **npm**: 用于安装依赖包
- **网络**: 能够访问 `openrouter.ai`

## 依赖包

- `axios`: HTTP 客户端，用于 API 调用
- `dotenv`: 环境变量管理

## 配置文件

测试工具会读取 `config.env` 文件中的以下配置：

```env
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

## 注意事项

1. **API 费用**: 测试过程中会消耗 OpenRouter API 的调用次数和费用
2. **网络稳定性**: 测试需要稳定的网络连接
3. **API 限制**: 注意 OpenRouter 的 API 调用频率限制
4. **安全性**: 不要在代码中硬编码 API Key，使用环境变量

## 故障排除

如果遇到问题，请按以下步骤排查：

1. 检查 `config.env` 文件配置
2. 确认网络连接正常
3. 验证 API Key 有效性
4. 查看详细的错误信息
5. 检查 Node.js 和依赖包版本

## 技术支持

如果问题仍然存在，请：
1. 查看测试报告中的详细错误信息
2. 检查 OpenRouter 服务状态
3. 联系技术支持团队

---

**版本**: 1.0.0  
**更新日期**: 2024年12月  
**兼容性**: Node.js 14+ / Windows 10+ 