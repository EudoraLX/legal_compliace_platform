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
