/*
 法律合同合规分析系统数据库表结构
 支持双法律体系合规分析、AI优化建议、翻译版本等功能
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for contracts
-- ----------------------------
DROP TABLE IF EXISTS `contracts`;
CREATE TABLE `contracts` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '合同ID',
  `filename` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '存储文件名',
  `original_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '原始文件名',
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '合同原文内容',
  `file_size` bigint DEFAULT NULL COMMENT '文件大小(字节)',
  `file_type` varchar(20) DEFAULT NULL COMMENT '文件类型(pdf, docx, doc, txt)',
  
  -- 法律体系选择
  `primary_law` varchar(50) DEFAULT 'china' COMMENT '主要法律体系',
  `secondary_law` varchar(50) DEFAULT NULL COMMENT '次要法律体系',
  
  -- 分析结果
  `compliance_score` decimal(5,2) DEFAULT NULL COMMENT '合规评分(0-100)',
  `risk_level` varchar(20) DEFAULT NULL COMMENT '风险等级(high, medium, low)',
  `analysis_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '分析摘要',
  
  -- 时间戳
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_created_at` (`created_at`),
  KEY `idx_compliance_score` (`compliance_score`),
  KEY `idx_primary_law` (`primary_law`)
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic COMMENT = '合同基础信息表';

-- ----------------------------
-- Table structure for analysis_results
-- ----------------------------
DROP TABLE IF EXISTS `analysis_results`;
CREATE TABLE `analysis_results` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '分析结果ID',
  `contract_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '合同ID',
  
  -- 合规分析
  `compliance_score` decimal(5,2) NOT NULL COMMENT '合规评分',
  `risk_level` varchar(20) NOT NULL COMMENT '风险等级',
  `analysis_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '分析摘要',
  
  -- 风险因素
  `risk_factors` json DEFAULT NULL COMMENT '风险因素JSON数组',
  
  -- 改进建议
  `suggestions` json DEFAULT NULL COMMENT '改进建议JSON数组',
  
  -- 相关法条
  `matched_articles` json DEFAULT NULL COMMENT '匹配的相关法条JSON数组',
  
  -- 合同优化
  `optimized_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '优化后的合同文本',
  `modifications` json DEFAULT NULL COMMENT '修改建议JSON数组',
  `optimization_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '优化总结',
  
  -- 翻译版本
  `translation` json DEFAULT NULL COMMENT '翻译信息JSON对象',
  
  -- 分析时间
  `analyzed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分析完成时间',
  
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_contract_id` (`contract_id`),
  KEY `idx_analyzed_at` (`analyzed_at`),
  KEY `idx_compliance_score` (`compliance_score`),
  CONSTRAINT `fk_analysis_contract` FOREIGN KEY (`contract_id`) REFERENCES `contracts` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic COMMENT = '合同分析结果表';

-- ----------------------------
-- Table structure for contract_modifications
-- ----------------------------
DROP TABLE IF EXISTS `contract_modifications`;
CREATE TABLE `contract_modifications` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '修改建议ID',
  `analysis_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '分析结果ID',
  
  -- 修改信息
  `type` varchar(20) NOT NULL COMMENT '修改类型(add, modify, delete)',
  `position` varchar(100) NOT NULL COMMENT '修改位置(条款位置)',
  `original_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '原文内容',
  `optimized_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '优化后内容',
  
  -- 法律依据
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '修改原因和法律依据',
  `related_article` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '相关法律条款',
  
  -- 高亮信息
  `highlight_start` int DEFAULT NULL COMMENT '高亮开始位置',
  `highlight_end` int DEFAULT NULL COMMENT '高亮结束位置',
  `highlight_type` varchar(20) DEFAULT 'modify' COMMENT '高亮类型',
  
  -- 排序
  `sort_order` int DEFAULT 0 COMMENT '排序顺序',
  
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_analysis_id` (`analysis_id`),
  KEY `idx_type` (`type`),
  KEY `idx_sort_order` (`sort_order`),
  CONSTRAINT `fk_modification_analysis` FOREIGN KEY (`analysis_id`) REFERENCES `analysis_results` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic COMMENT = '合同修改建议表';

-- ----------------------------
-- Table structure for contract_translations
-- ----------------------------
DROP TABLE IF EXISTS `contract_translations`;
CREATE TABLE `contract_translations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '翻译ID',
  `analysis_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '分析结果ID',
  
  -- 翻译信息
  `target_language` varchar(10) NOT NULL COMMENT '目标语言代码(en, ja, de, fr, es, ru, ko)',
  `language_name` varchar(50) NOT NULL COMMENT '语言名称',
  `translated_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '翻译后的完整合同文本',
  
  -- 翻译的修改建议
  `translated_modifications` json DEFAULT NULL COMMENT '翻译后的修改建议JSON数组',
  
  -- 翻译时间
  `translated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '翻译完成时间',
  
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_analysis_language` (`analysis_id`, `target_language`),
  KEY `idx_target_language` (`target_language`),
  CONSTRAINT `fk_translation_analysis` FOREIGN KEY (`analysis_id`) REFERENCES `analysis_results` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic COMMENT = '合同翻译表';

-- ----------------------------
-- Table structure for legal_articles
-- ----------------------------
DROP TABLE IF EXISTS `legal_articles`;
CREATE TABLE `legal_articles` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '法条ID',
  `article_code` varchar(100) NOT NULL COMMENT '法条编号',
  `article_title` varchar(200) NOT NULL COMMENT '法条标题',
  `law_system` varchar(50) NOT NULL COMMENT '法律体系(china, usa, eu, japan等)',
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT '法条内容',
  `category` varchar(100) DEFAULT NULL COMMENT '法条分类',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否有效',
  
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE KEY `uk_article_code` (`article_code`),
  KEY `idx_law_system` (`law_system`),
  KEY `idx_category` (`category`)
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = Dynamic COMMENT = '法律条款表';
-- 插入示例合同
INSERT INTO contracts (id, filename, original_name, content, file_size, file_type, primary_law, secondary_law, compliance_score, risk_level, analysis_summary, created_at) VALUES
('contract-001', 'contract_001.pdf', '国际贸易合同.pdf', '甲方：中国ABC贸易公司\n乙方：美国XYZ公司\n\n第一条 货物名称：电子产品\n第二条 数量：1000件\n第三条 价格：每件50美元\n第四条 交货期：2024年6月30日前\n第五条 付款方式：信用证\n\n甲方代表：张三\n乙方代表：John Smith\n\n签订日期：2024年1月15日', 2048, '.pdf', 'china', 'usa', 85.50, 'medium', '合同基本符合对外贸易法要求，建议完善风险条款', '2024-01-15 10:00:00');

-- 插入分析结果（简化translation字段，避免编码问题）
INSERT INTO analysis_results (id, contract_id, compliance_score, risk_level, analysis_summary, risk_factors, suggestions, matched_articles, optimized_text, modifications, optimization_summary, translation, analyzed_at) VALUES
('analysis-001', 'contract-001', 85.50, 'medium', '合同基本符合对外贸易法要求，建议完善风险条款', 
'[{"type": "payment_risk", "description": "信用证付款存在汇率风险", "severity": "medium", "suggestion": "建议增加汇率波动保护条款"}]',
'["建议增加不可抗力条款", "建议明确争议解决方式", "建议增加质量保证条款"]',
'[{"article": "《对外贸易法》第32条", "description": "对外贸易经营者应当依法经营", "compliance": true}, {"article": "《民法典》第463条", "description": "合同订立应当遵循诚实信用原则", "compliance": true}]',
'甲方：中国ABC贸易公司\n乙方：美国XYZ公司\n\n第一条 货物名称：电子产品\n第二条 数量：1000件\n第三条 价格：每件50美元\n第四条 交货期：2024年6月30日前\n第五条 付款方式：信用证\n第六条 不可抗力：如遇不可抗力事件，双方可协商延期履行\n第七条 争议解决：因本合同引起的争议，双方应友好协商解决\n第八条 质量保证：乙方保证货物质量符合合同约定\n\n甲方代表：张三\n乙方代表：John Smith\n\n签订日期：2024年1月15日',
'[{"type": "add", "position": "第六条", "original_text": "", "optimized_text": "不可抗力：如遇不可抗力事件，双方可协商延期履行", "reason": "增加不可抗力条款，提高合同风险防范能力", "related_article": "《民法典》第180条"}]',
'合同优化完成，增加了不可抗力、争议解决、质量保证等条款，提高了合同的完整性和风险防范能力',
'{"target_language": "en", "translated_text": "Party A: China ABC Trading Company\\nParty B: US XYZ Company\\n\\nArticle 1: Product Name: Electronic Products\\nArticle 2: Quantity: 1000 pieces\\nArticle 3: Price: $50 per piece\\nArticle 4: Delivery Date: Before June 30, 2024\\nArticle 5: Payment Method: Letter of Credit\\nArticle 6: Force Majeure: In case of force majeure events, both parties may negotiate to delay performance\\nArticle 7: Dispute Resolution: Disputes arising from this contract shall be resolved through friendly negotiation\\nArticle 8: Quality Assurance: Party B guarantees that the quality of goods meets the contract requirements\\n\\nParty A Representative: Zhang San\\nParty B Representative: John Smith\\n\\nDate of Signing: January 15, 2024"}',
'2024-01-15 10:30:00');

-- 插入修改建议详情
INSERT INTO contract_modifications (id, analysis_id, type, position, original_text, optimized_text, reason, related_article, highlight_start, highlight_end, highlight_type, sort_order) VALUES
('mod-001', 'analysis-001', 'add', '第六条', '', '不可抗力：如遇不可抗力事件，双方可协商延期履行', '增加不可抗力条款，提高合同风险防范能力', '《民法典》第180条', NULL, NULL, 'add', 1),
('mod-002', 'analysis-001', 'add', '第七条', '', '争议解决：因本合同引起的争议，双方应友好协商解决', '明确争议解决方式，避免纠纷升级', '《民法典》第10条', NULL, NULL, 'add', 2),
('mod-003', 'analysis-001', 'add', '第八条', '', '质量保证：乙方保证货物质量符合合同约定', '增加质量保证条款，保护甲方权益', '《对外贸易法》第35条', NULL, NULL, 'add', 3);

-- 插入翻译记录
INSERT INTO contract_translations (id, analysis_id, target_language, language_name, translated_text, translated_modifications, translated_at) VALUES
('trans-001', 'analysis-001', 'en', '英语版本', 'Party A: China ABC Trading Company\nParty B: US XYZ Company\n\nArticle 1: Product Name: Electronic Products\nArticle 2: Quantity: 1000 pieces\nArticle 3: Price: $50 per piece\nArticle 4: Delivery Date: Before June 30, 2024\nArticle 5: Payment Method: Letter of Credit\nArticle 6: Force Majeure: In case of force majeure events, both parties may negotiate to delay performance\nArticle 7: Dispute Resolution: Disputes arising from this contract shall be resolved through friendly negotiation\nArticle 8: Quality Assurance: Party B guarantees that the quality of goods meets the contract requirements\n\nParty A Representative: Zhang San\nParty B Representative: John Smith\n\nDate of Signing: January 15, 2024', '[{"original_text": "", "modified_text": "Force Majeure: In case of force majeure events, both parties may negotiate to delay performance", "legal_basis": "Civil Code Article 180", "reason": "Add force majeure clause to improve contract risk prevention"}]', '2024-01-15 11:00:00');