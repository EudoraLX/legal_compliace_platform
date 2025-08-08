const mysql = require('mysql2/promise');

let db;

async function initDatabase() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'legal_compliance'
    });
    
    // 创建表
    await db.execute(`
      CREATE TABLE IF NOT EXISTS contracts (
        id VARCHAR(36) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        content TEXT,
        analysis_result JSON,
        risk_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('数据库连接成功');
    return db;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return null;
  }
}

async function saveContract(contractData) {
  if (!db) return null;
  
  try {
    await db.execute(
      'INSERT INTO contracts (id, filename, original_name, content, analysis_result, risk_score) VALUES (?, ?, ?, ?, ?, ?)',
      [
        contractData.id,
        contractData.filename,
        contractData.original_name,
        contractData.content,
        JSON.stringify(contractData.analysis_result),
        contractData.risk_score
      ]
    );
    return true;
  } catch (error) {
    console.error('保存合同数据失败:', error);
    return false;
  }
}

async function getContractHistory() {
  if (!db) return [];
  
  try {
    const [rows] = await db.execute(
      'SELECT id, original_name, risk_score, created_at FROM contracts ORDER BY created_at DESC LIMIT 20'
    );
    return rows;
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

async function getContractById(id) {
  if (!db) return null;
  
  try {
    const [rows] = await db.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) return null;
    
    const contract = rows[0];
    contract.analysis_result = JSON.parse(contract.analysis_result);
    return contract;
  } catch (error) {
    console.error('获取合同详情失败:', error);
    return null;
  }
}

// 获取统计数据
async function getStatistics() {
  if (!db) return null;
  
  try {
    // 总分析数量
    const [totalResult] = await db.execute('SELECT COUNT(*) as total FROM contracts');
    const total = totalResult[0].total;
    
    // 平均分数
    const [avgResult] = await db.execute('SELECT AVG(risk_score) as avg_score FROM contracts');
    const avgScore = avgResult[0].avg_score || 0;
    
    // 分数分布
    const [scoreDistribution] = await db.execute(`
      SELECT 
        CASE 
          WHEN risk_score >= 90 THEN '优秀'
          WHEN risk_score >= 70 THEN '良好'
          WHEN risk_score >= 50 THEN '一般'
          ELSE '较差'
        END as level,
        COUNT(*) as count
      FROM contracts 
      GROUP BY 
        CASE 
          WHEN risk_score >= 90 THEN '优秀'
          WHEN risk_score >= 70 THEN '良好'
          WHEN risk_score >= 50 THEN '一般'
          ELSE '较差'
        END
    `);
    
    // 最近7天的分析数量
    const [recentAnalysis] = await db.execute(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM contracts 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);
    
    return {
      total,
      avgScore: Math.round(avgScore * 100) / 100,
      scoreDistribution,
      recentAnalysis
    };
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return null;
  }
}

// 删除分析记录
async function deleteContract(id) {
  if (!db) return false;
  
  try {
    await db.execute('DELETE FROM contracts WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error('删除合同记录失败:', error);
    return false;
  }
}

module.exports = {
  initDatabase,
  saveContract,
  getContractHistory,
  getContractById,
  getStatistics,
  deleteContract,
  getDb: () => db
}; 