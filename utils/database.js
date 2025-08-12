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
  if (!await checkDbConnection()) return [];
  
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
  try {
    console.log('getContractById: 开始查询，ID:', id);
    
    if (!await checkDbConnection()) {
      console.log('getContractById: 数据库未连接');
      return null;
    }
    
    console.log('getContractById: 数据库连接正常，执行查询...');
    const [rows] = await db.execute(
      'SELECT * FROM contracts WHERE id = ?',
      [id]
    );
    
    console.log('getContractById: 查询结果行数:', rows.length);
    
    if (rows.length === 0) {
      console.log('getContractById: 未找到记录，ID:', id);
      return null;
    }
    
    const contract = rows[0];
    console.log('getContractById: 找到合同，字段:', Object.keys(contract));
    console.log('getContractById: analysis_result类型:', typeof contract.analysis_result);
    console.log('getContractById: analysis_result值:', contract.analysis_result ? '存在' : 'null/undefined');
    
    if (contract.analysis_result) {
      // MySQL的JSON字段已经自动解析为对象，不需要再次解析
      console.log('getContractById: analysis_result字段已存在，类型:', typeof contract.analysis_result);
      
      // 如果analysis_result是字符串，则尝试解析
      if (typeof contract.analysis_result === 'string') {
        try {
          contract.analysis_result = JSON.parse(contract.analysis_result);
          console.log('getContractById: JSON字符串解析成功');
        } catch (parseError) {
          console.error('getContractById: JSON字符串解析失败:', parseError);
          return null;
        }
      }
      
      // 验证analysis_result的结构
      if (typeof contract.analysis_result === 'object' && contract.analysis_result !== null) {
        console.log('getContractById: analysis_result结构验证通过');
        console.log('getContractById: 包含的键:', Object.keys(contract.analysis_result));
      } else {
        console.log('getContractById: analysis_result结构无效');
        return null;
      }
    } else {
      console.log('getContractById: analysis_result字段为空');
      return null;
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
  if (!await checkDbConnection()) return false;
  
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
  getDb,
  checkDbConnection
}; 