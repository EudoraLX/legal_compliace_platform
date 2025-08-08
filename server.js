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
const { initDatabase, saveContract, getContractHistory, getContractById, getStatistics, deleteContract } = require('./utils/database');
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

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    const contractId = uuidv4();

    // 提取文本
    const text = await extractText(filePath, fileType);

    // 使用AI分析合规性
    const analysis = await aiService.analyzeContract(text);

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
    const contract = await getContractById(req.params.id);
    
    if (!contract) {
      return res.status(404).json({ error: '分析记录不存在' });
    }

    res.json(contract);
  } catch (error) {
    console.error('获取分析结果错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取统计数据
app.get('/api/statistics', async (req, res) => {
  try {
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

// 启动服务器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('法律合同合规AI分析平台已启动');
  });
}

startServer(); 