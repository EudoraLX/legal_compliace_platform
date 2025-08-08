# 法律合同合规AI分析平台

基于《中华人民共和国对外贸易法》的智能合同合规分析系统，帮助用户快速识别合同中的合规风险和提供改进建议。

## 🚀 功能特性

- **多格式支持**: 支持 PDF、Word、TXT 格式文件上传
- **智能分析**: 基于对外贸易法条款进行合规性分析
- **风险识别**: 自动识别合同中的合规风险因素
- **改进建议**: 提供具体的合同改进建议
- **可视化结果**: 直观的评分和风险展示
- **历史记录**: 保存分析历史，支持查看历史结果

## 🏗️ 系统架构

```
前端界面 → 后端API → 文本分析引擎 → 数据库
```

### 技术栈

- **前端**: HTML5 + CSS3 + JavaScript + Bootstrap 5
- **后端**: Node.js + Express.js
- **数据库**: MySQL 8.0
- **文件处理**: pdf-parse, mammoth
- **部署**: Docker + Docker Compose

## 📋 合规分析规则

系统基于《中华人民共和国对外贸易法》进行以下分析：

### 合规检查项目
- 对外贸易活动识别
- 进出口贸易条款
- 海关程序相关
- 许可证管理
- 配额管理
- 禁止/限制商品识别

### 风险因素识别
- 高风险词汇检测
- 合同要素完整性
- 法律条款匹配度

## 🛠️ 安装部署

### 方式一：Docker 部署（推荐）

1. **克隆项目**
```bash
git clone <repository-url>
cd legal-contract-compliance-ai
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **访问系统**
打开浏览器访问: http://localhost:3001

### 方式二：本地开发

1. **安装依赖**
```bash
npm install
```

2. **配置数据库**
- 安装 MySQL 8.0
- 创建数据库 `legal_compliance`
- 修改 `config.env` 中的数据库配置

3. **启动服务**
```bash
npm start
```

## 📖 使用说明

### 1. 上传合同文件
- 点击上传区域或拖拽文件
- 支持 PDF、Word、TXT 格式
- 文件大小限制 10MB

### 2. 开始分析
- 选择文件后点击"开始分析"
- 系统自动提取文本内容
- 进行合规性分析

### 3. 查看结果
- 合规评分（0-100分）
- 风险因素列表
- 改进建议
- 可导出分析报告

## 🔧 配置说明

### 环境变量配置

创建 `.env` 文件或修改 `config.env`：

```env
# 服务器配置
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=legal_compliance

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# AI配置
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### AI模型配置

系统使用 OpenRouter 的 `openai/gpt-oss-20b:free` 模型进行合同分析。这是一个免费的开源模型，具有以下特点：

- **免费使用**: 无需付费即可使用
- **开源模型**: 基于 GPT-2 架构的开源模型
- **中文支持**: 支持中文文本分析
- **法律专业**: 经过法律文本训练的模型

### 数据库配置

系统会自动创建以下表结构：

```sql
CREATE TABLE contracts (
    id VARCHAR(36) PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    content TEXT,
    analysis_result JSON,
    risk_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 📊 API 接口

### 1. 合同分析
```
POST /api/analyze
Content-Type: multipart/form-data

参数: contract (文件)
返回: { id, filename, analysis }
```

### 2. 获取历史记录
```
GET /api/history
返回: [{ id, original_name, risk_score, created_at }]
```

### 3. 获取详细结果
```
GET /api/analysis/:id
返回: { id, filename, content, analysis_result, risk_score }
```

## 🧪 测试示例

### 测试合同内容示例

```
对外贸易合同

甲方：中国进出口贸易公司
乙方：美国贸易伙伴公司

第一条 合同标的
乙方同意向甲方出口电子产品，包括但不限于手机、电脑等。

第二条 贸易方式
采用一般贸易方式，通过海关正常报关程序。

第三条 许可证要求
乙方承诺所有出口商品均符合相关许可证要求。

第四条 违约责任
如任何一方违反本协议，应承担相应法律责任。
```

## 🔒 安全说明

- 文件上传限制：仅支持指定格式，大小限制
- 数据库安全：使用参数化查询防止SQL注入
- 文件处理：临时文件自动清理
- 访问控制：CORS配置，防止跨域攻击

## 📝 开发计划

- [ ] 支持更多法律法规
- [ ] 增加AI模型训练
- [ ] 添加用户认证系统
- [ ] 支持批量文件分析
- [ ] 增加报告模板定制
- [ ] 集成第三方法律数据库

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

MIT License

## 📞 联系方式

如有问题或建议，请提交 Issue 或联系开发团队。

---

**免责声明**: 本系统仅作为辅助工具，分析结果仅供参考，具体法律问题请咨询专业律师。 