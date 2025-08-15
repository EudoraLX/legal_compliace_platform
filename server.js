const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件格式'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// 导入工具模块
const { extractText } = require('./utils/textExtractor');
const { analyzeForeignTradeCompliance, generateContractModifications } = require('./utils/analyzer');
const { initDatabase, saveContract, getContractHistory, getContractById, getStatistics, deleteContract, checkDbConnection } = require('./utils/database');
const aiService = require('./utils/aiService');

// 数据库连接
let db;

// API路由

// 文件上传和分析
app.post('/api/analyze', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    const contractId = uuidv4();

    // 提取文本
    const text = await extractText(filePath, fileType);

    // 获取法律体系信息
    const primaryLaw = req.body.primaryLaw || 'china';
    const secondaryLaw = req.body.secondaryLaw || null;

    // 使用AI分析合规性，考虑选择的法律体系
    const analysis = await aiService.analyzeContract(text, primaryLaw, secondaryLaw);

    // 保存到数据库
    await saveContract({
      id: contractId,
      filename: req.file.filename,
      original_name: req.file.originalname,
      content: text,
      analysis_result: analysis,
      risk_score: analysis.compliance_score
    });

    // 删除临时文件
    fs.unlinkSync(filePath);

    res.json({
      id: contractId,
      filename: req.file.originalname,
      analysis: analysis,
      contract_text: text
    });

  } catch (error) {
    console.error('分析错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取分析历史
app.get('/api/history', async (req, res) => {
  try {
    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }
    
    const history = await getContractHistory();
    res.json(history);
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取详细分析结果
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log('API: 请求获取分析结果，ID:', id);
    
    // 检查数据库连接
    if (!await checkDbConnection()) {
      console.log('API: 数据库连接失败');
      return res.status(500).json({ error: '数据库连接失败' });
    }
    
    console.log('API: 数据库连接正常，调用getContractById...');
    const contract = await getContractById(id);
    console.log('API: getContractById返回结果:', contract ? '成功' : '失败');
    
    if (!contract) {
      console.log('API: 未找到合同记录，ID:', id);
      return res.status(404).json({ error: '分析记录不存在' });
    }

    // 检查必要字段
    if (!contract.analysis_result) {
      console.log('API: 合同数据缺少analysis_result字段');
      return res.status(500).json({ error: '分析结果数据不完整' });
    }

    console.log('API: 成功返回合同数据，ID:', id);
    res.json(contract);
  } catch (error) {
    console.error('API: 获取分析结果错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
  try {
    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }
    
    const stats = await getStatistics();
    res.json(stats);
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除分析记录
app.delete('/api/analysis/:id', async (req, res) => {
  try {
    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }
    
    const success = await deleteContract(req.params.id);
    if (success) {
      res.json({ message: '删除成功' });
    } else {
      res.status(404).json({ error: '记录不存在' });
    }
  } catch (error) {
    console.error('删除记录错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 合同修改建议
app.post('/api/modify-contract', async (req, res) => {
  try {
    const { original_text, current_text, analysis } = req.body;
    
    if (!original_text || !analysis) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 使用AI生成合同修改建议
    const modifications = await aiService.generateContractModifications(current_text || original_text, analysis);
    
    res.json({
      modified_text: modifications.modified_text,
      modifications: modifications.modifications,
      summary: modifications.summary
    });

  } catch (error) {
    console.error('合同修改错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI智能修改建议（已整合到合规分析中）
app.post('/api/ai-modify-contract', async (req, res) => {
  try {
    const { original_text, analysis } = req.body;
    
    if (!original_text || !analysis) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 现在合规检测和修改已经整合，直接返回分析结果中的优化建议
    if (analysis.contract_optimization) {
      res.json({
        modified_text: analysis.contract_optimization.optimized_text,
        modifications: analysis.contract_optimization.modifications,
        summary: analysis.contract_optimization.summary
      });
    } else {
      res.status(400).json({ error: '分析结果中未包含合同优化信息' });
    }

  } catch (error) {
    console.error('AI智能修改建议错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 翻译API端点
app.post('/api/translate', async (req, res) => {
  try {
    const { originalText, modifiedText, modifications, targetLanguage, primaryLaw, secondaryLaw } = req.body;
    
    if (!originalText || !targetLanguage) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 构建翻译提示词，确保合同符合两个国家的法律
    let prompt = `请将以下中文合同内容翻译成${getLanguageName(targetLanguage)}。这是一个需要同时符合${getLawDisplayName(primaryLaw)}${secondaryLaw ? `和${getLawDisplayName(secondaryLaw)}` : ''}法律要求的国际合同。

重要要求：
1. 翻译后的合同必须同时符合两个国家的法律要求
2. 确保在两国都具有法律效力
3. 保持法律术语的准确性和专业性
4. 使用目标语言中对应的法律术语
5. 确保合同条款在两个国家都能被正确理解和执行

原文合同：
${originalText}

修改后合同：
${modifiedText}

修改建议：
${JSON.stringify(modifications, null, 2)}

请返回JSON格式的翻译结果，包含以下字段：
{
  "originalText": "翻译后的原文",
  "modifiedText": "翻译后的修改后合同",
  "modifications": [
    {
      "type": "修改类型",
      "text": "翻译后的修改建议",
      "reason": "翻译后的修改原因",
      "lawRef": "翻译后的法律依据"
    }
  ]
}`;

    // 使用AI服务进行翻译
    const translationResult = await aiService.translateContent(prompt, targetLanguage);
    
    res.json(translationResult);

  } catch (error) {
    console.error('翻译错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取语言名称
function getLanguageName(langCode) {
  const languageNames = {
    'en': '英语',
    'ja': '日语',
    'ko': '韩语',
    'de': '德语',
    'fr': '法语',
    'es': '西班牙语',
    'ru': '俄语'
  };
  return languageNames[langCode] || langCode;
}

// 获取法律体系显示名称
function getLawDisplayName(lawCode) {
  const lawNames = {
    'china': '中华人民共和国法律',
    'usa': '美国法律',
    'eu': '欧盟法律',
    'uk': '英国法律',
    'japan': '日本法律',
    'singapore': '新加坡法律'
  };
  return lawNames[lawCode] || lawCode;
}

// 启动服务器
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`服务器运行在 http://localhost:${PORT}`);
      console.log('法律合同合规AI分析平台已启动');
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

startServer(); 