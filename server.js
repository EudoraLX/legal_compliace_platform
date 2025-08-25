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
const AIService = require('./utils/aiService');
const aiService = new AIService();

// 数据库连接
let db;

// API路由

// 文件上传和分析
app.post('/api/analyze', upload.single('contract'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传合同文件' });
    }

    const primaryLaw = req.body.primaryLaw || 'china';
    const secondaryLaw = req.body.secondaryLaw || null;

    // 设置响应头，支持流式传输
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // 发送进度更新函数
    const sendProgress = (progress, message) => {
      res.write(JSON.stringify({ type: 'progress', progress, message }) + '\n');
    };

    // 发送步骤结果函数
    const sendStepResult = (step, result) => {
      res.write(JSON.stringify({ type: 'step_result', step, result }) + '\n');
    };

    // 发送完成信号函数
    const sendComplete = (result) => {
      res.write(JSON.stringify({ type: 'complete', result }) + '\n');
      res.end();
    };

    try {
      // 提取文本内容
      const text = await extractText(req.file.path, path.extname(req.file.originalname).toLowerCase());
      console.log('提取的文本长度:', text.length);

      // 发送开始信号
      sendProgress(20, '开始AI分析流程...');

      // 使用完整的分析流程（支持部分失败）
      console.log('开始完整分析流程...');
      const analysis = await aiService.analyzeContractComplete(text, primaryLaw, secondaryLaw, sendStepResult);
      
      console.log('分析完成，状态:', analysis.analysis_status);
      console.log('可重试步骤:', analysis.can_retry_steps);

      // 保存到数据库
      const contractId = await saveContract({
        id: uuidv4(),
        filename: req.file.filename,
        original_name: req.file.originalname,
        content: text,
        file_size: req.file.size,
        file_type: path.extname(req.file.originalname),
        primary_law: primaryLaw || 'china',
        secondary_law: secondaryLaw || null,
        analysis_result: analysis,
        compliance_score: analysis.compliance_score,
        risk_level: analysis.risk_level,
        analysis_summary: analysis.analysis_summary
      });
      analysis.id = contractId;
      
      // 删除临时文件
      fs.unlinkSync(req.file.path);

      // 发送完成信号
      sendComplete(analysis);

    } catch (error) {
      console.error('分析过程中出错:', error);
      res.write(JSON.stringify({ type: 'error', error: error.message }) + '\n');
      res.end();
    }

  } catch (error) {
    console.error('分析API错误:', error);
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
    if (!contract.analysis_results) {
      console.log('API: 合同数据缺少analysis_results字段');
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
    const translationResult = await aiService.translateContract(originalText, targetLanguage, primaryLaw, secondaryLaw);
    
    // 返回标准格式的翻译结果
    res.json({
      success: true,
      translated_text: translationResult.translated_text || originalText,
      message: '翻译完成'
    });

  } catch (error) {
    console.error('翻译错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 重试特定分析步骤
app.post('/api/retry-step', async (req, res) => {
  try {
    const { stepName, contractId, primaryLaw, secondaryLaw } = req.body;
    
    if (!stepName || !contractId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }

    // 获取原始合同内容
    const contract = await getContractById(contractId);
    if (!contract) {
      return res.status(404).json({ error: '合同记录不存在' });
    }

    // 重试特定步骤
    let result;
    switch (stepName) {
      case 'legal_analysis':
        result = await aiService.analyzeLegalCompliance(contract.content, primaryLaw, secondaryLaw);
        break;
      
      case 'optimization':
        // 需要先有法律分析结果
        if (!contract.analysis_results) {
          return res.status(400).json({ error: '需要先完成法律分析' });
        }
        result = await aiService.optimizeContract(contract.content, contract.analysis_results, primaryLaw, secondaryLaw);
        break;
      
      case 'translation':
        // 需要先有优化结果
        if (!contract.analysis_results?.contract_optimization) {
          return res.status(400).json({ error: '需要先完成合同优化' });
        }
        const optimizedText = contract.analysis_results.contract_optimization.optimized_text || contract.content;
        result = await aiService.translateContract(optimizedText, 'en', primaryLaw, secondaryLaw);
        break;
      
      default:
        return res.status(400).json({ error: '无效的步骤名称' });
    }

    // 更新数据库中的分析结果
    await updateAnalysisStep(contractId, stepName, result);

    res.json({
      success: true,
      step: stepName,
      result: result,
      message: `${stepName} 步骤重试成功`
    });

  } catch (error) {
    console.error('重试步骤失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新特定步骤的分析结果
async function updateAnalysisStep(contractId, stepName, result) {
  try {
    // 这里需要根据具体的数据库结构来更新
    // 暂时返回成功，具体实现需要根据数据库表结构调整
    console.log(`更新步骤 ${stepName} 的结果:`, result);
    return true;
  } catch (error) {
    console.error('更新分析步骤失败:', error);
    throw error;
  }
}

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

// 翻译原文API
app.post('/api/translate-original', async (req, res) => {
  try {
    const { original_text, target_language, primaryLaw, secondaryLaw, contract_id } = req.body;
    
    if (!original_text) {
      return res.status(400).json({ error: '缺少原文内容' });
    }

    // 调用AI翻译原文
    const translation = await aiService.translateContract(original_text, target_language, primaryLaw, secondaryLaw);

    if (translation.status === 'failed') {
      return res.status(500).json({ error: translation.error });
    }

    // 如果有contract_id，保存翻译结果到数据库
    if (contract_id) {
      try {
        await saveTranslationToDatabase(contract_id, {
          target_language: target_language || 'en',
          translated_text: translation.translated_text,
          translated_modifications: []
        });
        console.log('翻译结果已保存到数据库，合同ID:', contract_id);
      } catch (saveError) {
        console.error('保存翻译结果到数据库失败:', saveError);
        // 即使保存失败，也不影响翻译结果的返回
      }
    }

    res.json({
      success: true,
      translated_text: translation.translated_text,
      target_language: translation.target_language
    });

  } catch (error) {
    console.error('翻译原文失败:', error);
    res.status(500).json({ error: error.message });
  }
}); 

// 保存翻译结果到数据库
async function saveTranslationToDatabase(contractId, translationData) {
  try {
    // 检查数据库连接
    if (!await checkDbConnection()) {
      throw new Error('数据库连接失败');
    }

    // 获取分析结果ID
    const [analysisRows] = await db.execute(
      'SELECT id FROM analysis_results WHERE contract_id = ?',
      [contractId]
    );

    if (analysisRows.length === 0) {
      throw new Error('未找到对应的分析结果');
    }

    const analysisId = analysisRows[0].id;

    // 检查是否已存在翻译记录
    const [existingRows] = await db.execute(
      'SELECT id FROM contract_translations WHERE analysis_id = ?',
      [analysisId]
    );

    if (existingRows.length > 0) {
      // 更新现有翻译记录
      await db.execute(
        `UPDATE contract_translations SET 
         target_language = ?, 
         language_name = ?, 
         translated_text = ?, 
         translated_modifications = ?,
         updated_at = NOW()
         WHERE analysis_id = ?`,
        [
          translationData.target_language,
          getLanguageDisplayName(translationData.target_language),
          translationData.translated_text,
          JSON.stringify(translationData.translated_modifications || []),
          analysisId
        ]
      );
      console.log('翻译记录已更新');
    } else {
      // 插入新的翻译记录
      const transId = require('crypto').randomUUID();
      await db.execute(
        `INSERT INTO contract_translations (
          id, analysis_id, target_language, language_name, translated_text, translated_modifications
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          transId,
          analysisId,
          translationData.target_language,
          getLanguageDisplayName(translationData.target_language),
          translationData.translated_text,
          JSON.stringify(translationData.translated_modifications || [])
        ]
      );
      console.log('翻译记录已插入');
    }

    // 同时更新analysis_results表中的translation字段
    await db.execute(
      `UPDATE analysis_results SET 
       translation = ? 
       WHERE id = ?`,
      [JSON.stringify(translationData), analysisId]
    );

    return true;
  } catch (error) {
    console.error('保存翻译结果到数据库失败:', error);
    throw error;
  }
}

// 获取语言显示名称
function getLanguageDisplayName(langCode) {
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

// 保存翻译结果API端点
app.post('/api/save-translation', async (req, res) => {
  try {
    const { contract_id, translation } = req.body;
    
    if (!contract_id || !translation) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 保存翻译结果到数据库
    await saveTranslationToDatabase(contract_id, translation);
    
    res.json({
      success: true,
      message: '翻译结果保存成功'
    });

  } catch (error) {
    console.error('保存翻译结果失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 下载合同文件API端点
app.get('/api/download/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { language } = req.query;
    
    console.log('下载请求:', { contractId, language });
    
    if (!contractId) {
      return res.status(400).json({ error: '缺少合同ID' });
    }
    
    // 检查数据库连接
    if (!await checkDbConnection()) {
      return res.status(500).json({ error: '数据库连接失败' });
    }
    
    // 获取合同基础信息
    const [contractRows] = await db.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [contractId]
    );
    
    if (contractRows.length === 0) {
      return res.status(404).json({ error: '合同不存在' });
    }
    
    const contract = contractRows[0];
    
    // 获取分析结果
    const [analysisRows] = await db.execute(
      'SELECT * FROM analysis_results WHERE contract_id = ?',
      [contractId]
    );
    
    let content = '';
    let filename = '';
    
    if (language === 'zh') {
      // 中文版本：使用优化后的合同文本，如果没有则使用原文
      content = analysisRows.length > 0 && analysisRows[0].optimized_text 
        ? analysisRows[0].optimized_text 
        : contract.content;
      filename = `合同_中文_${contract.original_name || '未知文件'}`;
    } else {
      // 其他语言版本：查找对应的翻译
      if (analysisRows.length > 0) {
        const analysisId = analysisRows[0].id;
        const [translationRows] = await db.execute(
          'SELECT * FROM contract_translations WHERE analysis_id = ? AND target_language = ?',
          [analysisId, language]
        );
        
        if (translationRows.length > 0) {
          content = translationRows[0].translated_text;
          filename = `合同_${getLanguageDisplayName(language)}_${contract.original_name || '未知文件'}`;
        } else {
          // 如果没有找到翻译，返回原文
          content = contract.content;
          filename = `合同_原文_${contract.original_name || '未知文件'}`;
        }
      } else {
        // 如果没有分析结果，返回原文
        content = contract.content;
        filename = `合同_原文_${contract.original_name || '未知文件'}`;
      }
    }
    
    // 设置响应头
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}.txt"`);
    
    // 发送文件内容
    res.send(content);
    
    console.log('下载成功:', filename);
    
  } catch (error) {
    console.error('下载合同失败:', error);
    res.status(500).json({ error: error.message });
  }
}); 