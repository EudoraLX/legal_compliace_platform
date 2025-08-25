const mysql = require('mysql2/promise');

let db;

async function initDatabase() {
  try {
    // 如果已经有连接，先关闭
    if (db) {
      try {
        await db.end();
      } catch (error) {
        console.log('关闭旧连接时出错:', error);
      }
    }
    
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'legal_compliance'
    });
    
         // 创建新的表结构
     // 1. 创建合同基础信息表
     await db.execute(`
       CREATE TABLE IF NOT EXISTS contracts (
         id VARCHAR(36) PRIMARY KEY,
         filename VARCHAR(255) NOT NULL,
         original_name VARCHAR(255) NOT NULL,
         content LONGTEXT NOT NULL,
         file_size BIGINT,
         file_type VARCHAR(20),
         primary_law VARCHAR(50) DEFAULT 'china',
         secondary_law VARCHAR(50),
         compliance_score DECIMAL(5,2),
         risk_level VARCHAR(20),
         analysis_summary TEXT,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       )
     `);
     
     // 2. 创建分析结果表
     await db.execute(`
       CREATE TABLE IF NOT EXISTS analysis_results (
         id VARCHAR(36) PRIMARY KEY,
         contract_id VARCHAR(36) NOT NULL,
         compliance_score DECIMAL(5,2) NOT NULL,
         risk_level VARCHAR(20) NOT NULL,
         analysis_summary TEXT,
         risk_factors JSON,
         suggestions JSON,
         matched_articles JSON,
         optimized_text LONGTEXT,
         modifications JSON,
         optimization_summary TEXT,
         translation JSON,
         analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
       )
     `);
     
     // 3. 创建修改建议表
     await db.execute(`
       CREATE TABLE IF NOT EXISTS contract_modifications (
         id VARCHAR(36) PRIMARY KEY,
         analysis_id VARCHAR(36) NOT NULL,
         type VARCHAR(20) NOT NULL,
         position VARCHAR(100) NOT NULL,
         original_text TEXT,
         optimized_text TEXT,
         reason TEXT,
         related_article TEXT,
         highlight_start INT,
         highlight_end INT,
         highlight_type VARCHAR(20) DEFAULT 'modify',
         sort_order INT DEFAULT 0,
         FOREIGN KEY (analysis_id) REFERENCES analysis_results(id) ON DELETE CASCADE
       )
     `);
     
     // 4. 创建翻译表
     await db.execute(`
       CREATE TABLE IF NOT EXISTS contract_translations (
         id VARCHAR(36) PRIMARY KEY,
         analysis_id VARCHAR(36) NOT NULL,
         target_language VARCHAR(10) NOT NULL,
         language_name VARCHAR(50) NOT NULL,
         translated_text LONGTEXT,
         translated_modifications JSON,
         translated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (analysis_id) REFERENCES analysis_results(id) ON DELETE CASCADE
       )
     `);
     
     // 5. 创建法律条款表
     await db.execute(`
       CREATE TABLE IF NOT EXISTS legal_articles (
         id VARCHAR(36) PRIMARY KEY,
         article_code VARCHAR(100) UNIQUE NOT NULL,
         article_title VARCHAR(200) NOT NULL,
         law_system VARCHAR(50) NOT NULL,
         content TEXT,
         category VARCHAR(100),
         is_active TINYINT(1) DEFAULT 1
       )
     `);
    
    console.log('数据库连接成功');
    return db;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return null;
  }
}

// 获取数据库连接
function getDb() {
  return db;
}

// 检查数据库连接状态
async function checkDbConnection() {
  if (!db) {
    console.log('数据库未连接，尝试重新连接...');
    await initDatabase();
  } else {
    // 测试连接是否仍然有效
    try {
      await db.execute('SELECT 1');
    } catch (error) {
      console.log('数据库连接已断开，尝试重新连接...');
      await initDatabase();
    }
  }
  return db !== null;
}

async function saveContract(contractData) {
  if (!await checkDbConnection()) return null;
  
  try {
    // 保存合同基础信息
    await db.execute(
      `INSERT INTO contracts (
        id, filename, original_name, content, file_size, file_type, 
        primary_law, secondary_law, compliance_score, risk_level, analysis_summary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contractData.id,
        contractData.filename,
        contractData.original_name,
        contractData.content,
        contractData.file_size || null,
        contractData.file_type || null,
        contractData.primary_law || 'china',
        contractData.secondary_law || null,
        contractData.compliance_score || null,
        contractData.risk_level || null,
        contractData.analysis_summary || null
      ]
    );
    
    // 如果有分析结果，保存到analysis_results表
    if (contractData.analysis_result) {
      await saveAnalysisResult(contractData.id, contractData.analysis_result);
    }
    
    return contractData.id;
  } catch (error) {
    console.error('保存合同数据失败:', error);
    return null;
  }
}

// 保存分析结果
async function saveAnalysisResult(contractId, analysisData) {
  if (!await checkDbConnection()) return null;
  
  try {
    const analysisId = require('crypto').randomUUID();
    
    await db.execute(
      `INSERT INTO analysis_results (
        id, contract_id, compliance_score, risk_level, analysis_summary,
        risk_factors, suggestions, matched_articles, optimized_text,
        modifications, optimization_summary, translation
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        analysisId,
        contractId,
        analysisData.compliance_score || 0,
        analysisData.risk_level || 'unknown',
        analysisData.analysis_summary || null,
        JSON.stringify(analysisData.risk_factors || []),
        JSON.stringify(analysisData.suggestions || []),
        JSON.stringify(analysisData.matched_articles || []),
        analysisData.contract_optimization?.optimized_text || null,
        JSON.stringify(analysisData.contract_optimization?.modifications || []),
        analysisData.contract_optimization?.summary || null,
        JSON.stringify(analysisData.translation || {})
      ]
    );
    
    // 保存修改建议详情
    if (analysisData.contract_optimization?.modifications) {
      await saveModifications(analysisId, analysisData.contract_optimization.modifications);
    }
    
    // 保存翻译版本
    if (analysisData.translation) {
      await saveTranslation(analysisId, analysisData.translation);
    }
    
    return analysisId;
  } catch (error) {
    console.error('保存分析结果失败:', error);
    return null;
  }
}

// 保存修改建议详情
async function saveModifications(analysisId, modifications) {
  if (!await checkDbConnection()) return;
  
  try {
    for (let i = 0; i < modifications.length; i++) {
      const mod = modifications[i];
      const modId = require('crypto').randomUUID();
      
      await db.execute(
        `INSERT INTO contract_modifications (
          id, analysis_id, type, position, original_text, optimized_text,
          reason, related_article, highlight_start, highlight_end, highlight_type, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          modId,
          analysisId,
          mod.type || 'modify',
          mod.position || '',
          mod.original_text || '',
          mod.optimized_text || '',
          mod.reason || '',
          mod.related_article || '',
          mod.highlight_start || null,
          mod.highlight_end || null,
          mod.highlight_type || 'modify',
          i
        ]
      );
    }
  } catch (error) {
    console.error('保存修改建议失败:', error);
  }
}

// 保存翻译版本
async function saveTranslation(analysisId, translation) {
  if (!await checkDbConnection()) return;
  
  try {
    const transId = require('crypto').randomUUID();
    
    await db.execute(
      `INSERT INTO contract_translations (
        id, analysis_id, target_language, language_name, translated_text, translated_modifications
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        transId,
        analysisId,
        translation.target_language || 'en',
        getLanguageDisplayName(translation.target_language || 'en'),
        translation.translated_text || '',
        JSON.stringify(translation.translated_modifications || [])
      ]
    );
  } catch (error) {
    console.error('保存翻译版本失败:', error);
  }
}

async function getContractHistory() {
  if (!await checkDbConnection()) return [];
  
  try {
    // 先查询所有合同记录
    const [contractRows] = await db.execute(`
      SELECT 
        id, 
        original_name, 
        primary_law,
        secondary_law,
        created_at
      FROM contracts 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    
    if (contractRows.length === 0) {
      return [];
    }
    
    // 查询对应的分析结果
    const contractIds = contractRows.map(row => row.id);
    const [analysisRows] = await db.execute(`
      SELECT 
        ar.contract_id,
        ar.id as analysis_id,
        ar.compliance_score,
        ar.risk_level,
        ar.analysis_summary,
        ar.modifications,
        ar.translation
      FROM analysis_results ar
      WHERE ar.contract_id IN (${contractIds.map(() => '?').join(',')})
    `, contractIds);
    
    // 获取所有分析结果的ID，用于查询修改建议
    const analysisIds = analysisRows.map(row => row.analysis_id).filter(id => id);
    
    // 批量查询修改建议数量
    let modificationCounts = {};
    if (analysisIds.length > 0) {
      try {
        const [modificationRows] = await db.execute(`
          SELECT analysis_id, COUNT(*) as count
          FROM contract_modifications 
          WHERE analysis_id IN (${analysisIds.map(() => '?').join(',')})
          GROUP BY analysis_id
        `, analysisIds);
        
        modificationRows.forEach(row => {
          modificationCounts[row.analysis_id] = row.count;
        });
      } catch (modError) {
        console.warn('获取修改建议数量失败:', modError.message);
      }
    }
    
    // 构建分析结果映射
    const analysisMap = {};
    analysisRows.forEach(row => {
      const realModificationCount = modificationCounts[row.analysis_id] || 0;
      analysisMap[row.contract_id] = {
        compliance_score: row.compliance_score,
        risk_level: row.risk_level,
        analysis_summary: row.analysis_summary,
        modifications: Array(realModificationCount).fill({}), // 创建正确数量的占位符
        translation: row.translation || {}
      };
    });
    
    // 合并数据
    return contractRows.map(contract => ({
      ...contract,
      analysis_results: analysisMap[contract.id] || {
        compliance_score: 0,
        risk_level: 'unknown',
        analysis_summary: '暂无分析结果',
        modifications: [],
        translation: {}
      }
    }));
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

async function getContractById(id) {
  try {
    console.log('getContractById: 开始查询，ID:', id);
    
    if (!await checkDbConnection()) {
      console.log('getContractById: 数据库未连接');
      return null;
    }
    
    console.log('getContractById: 数据库连接正常，执行查询...');
    
    // 查询合同基础信息和分析结果
    const [rows] = await db.execute(`
      SELECT 
        c.*,
        ar.id as analysis_id,
        ar.compliance_score,
        ar.risk_level,
        ar.analysis_summary,
        ar.risk_factors,
        ar.suggestions,
        ar.matched_articles,
        ar.optimized_text,
        ar.modifications,
        ar.optimization_summary,
        ar.translation,
        ar.analyzed_at
      FROM contracts c
      LEFT JOIN analysis_results ar ON c.id = ar.contract_id
      WHERE c.id = ?
    `, [id]);
    
    console.log('getContractById: 查询结果行数:', rows.length);
    
    if (rows.length === 0) {
      console.log('getContractById: 未找到记录，ID:', id);
      return null;
    }
    
    const contract = rows[0];
    console.log('getContractById: 找到合同，字段:', Object.keys(contract));
    
    // 构建analysis_results结构
    if (contract.analysis_id) {
      // 从contract_modifications表获取真实的修改建议数据
      let realModifications = [];
      try {
        const [modificationRows] = await db.execute(
          'SELECT * FROM contract_modifications WHERE analysis_id = ? ORDER BY sort_order',
          [contract.analysis_id]
        );
        realModifications = modificationRows;
        console.log('getContractById: 从contract_modifications表获取到修改建议数量:', realModifications.length);
      } catch (modError) {
        console.warn('getContractById: 获取修改建议失败，使用默认值:', modError.message);
        realModifications = contract.modifications || [];
      }
      
      // 从contract_translations表获取真实的翻译数据
      let realTranslation = {};
      try {
        const [translationRows] = await db.execute(
          'SELECT * FROM contract_translations WHERE analysis_id = ? LIMIT 1',
          [contract.analysis_id]
        );
        if (translationRows.length > 0) {
          realTranslation = translationRows[0];
          console.log('getContractById: 从contract_translations表获取到翻译数据');
        } else {
          realTranslation = contract.translation || {};
          console.log('getContractById: 未找到翻译数据，使用默认值');
        }
      } catch (transError) {
        console.warn('getContractById: 获取翻译数据失败，使用默认值:', transError.message);
        realTranslation = contract.translation || {};
      }
      
      contract.analysis_results = {
        id: contract.analysis_id,
        compliance_score: contract.compliance_score,
        risk_level: contract.risk_level,
        analysis_summary: contract.analysis_summary,
        risk_factors: contract.risk_factors || [],
        suggestions: contract.suggestions || [],
        matched_articles: contract.matched_articles || [],
        optimized_text: contract.optimized_text,
        modifications: realModifications, // 使用真实的修改建议数据
        optimization_summary: contract.optimization_summary,
        translation: realTranslation, // 使用真实的翻译数据
        analyzed_at: contract.analyzed_at
      };
      
      // 清理重复字段
      delete contract.analysis_id;
      delete contract.compliance_score;
      delete contract.risk_level;
      delete contract.analysis_summary;
      delete contract.risk_factors;
      delete contract.suggestions;
      delete contract.matched_articles;
      delete contract.optimized_text;
      delete contract.modifications;
      delete contract.optimization_summary;
      delete contract.translation;
      delete contract.analyzed_at;
    } else {
      // 如果没有分析结果，提供默认值
      contract.analysis_results = {
        compliance_score: 0,
        risk_level: 'unknown',
        analysis_summary: '暂无分析结果',
        risk_factors: [],
        suggestions: [],
        matched_articles: [],
        optimized_text: contract.content,
        modifications: [],
        optimization_summary: '暂无优化建议',
        translation: {},
        analyzed_at: null
      };
    }
    
    console.log('getContractById: 成功返回合同数据');
    return contract;
  } catch (error) {
    console.error('getContractById: 获取合同详情失败:', error);
    return null;
  }
}

// 获取统计数据
async function getStatistics() {
  if (!await checkDbConnection()) return null;
  
  try {
    // 总分析数量
    const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM contracts');
    const total = totalResult[0].total;
    
    // 平均分数 - 从analysis_results表获取
    const [avgResult] = await db.execute(`
      SELECT AVG(ar.compliance_score) as avg_score 
      FROM contracts c 
      LEFT JOIN analysis_results ar ON c.id = ar.contract_id
      WHERE ar.compliance_score IS NOT NULL
    `);
    const avgScore = avgResult[0].avg_score || 0;
    
    // 分数分布 - 从analysis_results表获取
    const [scoreDistribution] = await db.execute(`
      SELECT 
        CASE 
          WHEN ar.compliance_score >= 90 THEN '优秀'
          WHEN ar.compliance_score >= 70 THEN '良好'
          WHEN ar.compliance_score >= 50 THEN '一般'
          ELSE '较差'
        END as level,
        COUNT(*) as count
      FROM contracts c
      LEFT JOIN analysis_results ar ON c.id = ar.contract_id
      WHERE ar.compliance_score IS NOT NULL
      GROUP BY 
        CASE 
          WHEN ar.compliance_score >= 90 THEN '优秀'
          WHEN ar.compliance_score >= 70 THEN '良好'
          WHEN ar.compliance_score >= 50 THEN '一般'
          ELSE '较差'
        END
    `);
    
    // 最近7天的分析数量
    const [recentAnalysis] = await db.execute(`
      SELECT DATE(c.created_at) as date, COUNT(*) as count
      FROM contracts c
      WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(c.created_at)
      ORDER BY date
    `);
    
    // 法律体系分布
    const [lawDistribution] = await db.execute(`
      SELECT 
        primary_law,
        COUNT(*) as count
      FROM contracts 
      GROUP BY primary_law
    `);
    
    // 风险等级分布
    const [riskDistribution] = await db.execute(`
      SELECT 
        ar.risk_level,
        COUNT(*) as count
      FROM contracts c
      LEFT JOIN analysis_results ar ON c.id = ar.contract_id
      WHERE ar.risk_level IS NOT NULL
      GROUP BY ar.risk_level
    `);
    
    return {
      total,
      avgScore: Math.round(avgScore * 100) / 100,
      scoreDistribution,
      recentAnalysis,
      lawDistribution,
      riskDistribution
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return null;
  }
}

// 删除分析记录
async function deleteContract(id) {
  if (!await checkDbConnection()) return false;
  
  try {
    await db.execute('DELETE FROM contracts WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除合同记录失败:', error);
    return false;
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

module.exports = {
  initDatabase,
  saveContract,
  saveAnalysisResult,
  saveModifications,
  saveTranslation,
  getContractHistory,
  getContractById,
  getStatistics,
  deleteContract,
  getDb,
  checkDbConnection
}; 