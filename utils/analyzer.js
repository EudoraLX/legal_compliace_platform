// 对外贸易法合规分析核心逻辑
function analyzeForeignTradeCompliance(text) {
  const analysis = {
    compliance_score: 0,
    risk_factors: [],
    suggestions: [],
    matched_articles: [],
    analysis_summary: ''
  };

  let score = 100;
  const textLower = text.toLowerCase();

  // 对外贸易法相关条例定义
  const foreignTradeRegulations = [
    {
      article: "《对外贸易法》第2条 - 适用范围",
      keywords: ["对外贸易", "进出口", "货物", "技术", "服务"],
      weight: 10,
      description: "确认合同是否属于对外贸易法调整范围",
      compliance: true
    },
    {
      article: "《对外贸易法》第3条 - 对外贸易经营者",
      keywords: ["经营者", "登记", "备案", "资格"],
      weight: 15,
      description: "检查合同主体是否具备对外贸易经营资格",
      compliance: true
    },
    {
      article: "《对外贸易法》第15条 - 货物进出口管理",
      keywords: ["许可证", "配额", "限制", "禁止"],
      weight: 20,
      description: "检查进出口货物是否需要许可证或配额管理",
      compliance: true
    },
    {
      article: "《对外贸易法》第16条 - 技术进出口管理",
      keywords: ["技术", "专利", "专有技术", "技术转让"],
      weight: 15,
      description: "检查技术进出口是否符合管理规定",
      compliance: true
    },
    {
      article: "《对外贸易法》第19条 - 国际服务贸易",
      keywords: ["服务", "咨询", "代理", "运输"],
      weight: 10,
      description: "检查国际服务贸易的合规性",
      compliance: true
    },
    {
      article: "《对外贸易法》第23条 - 对外贸易秩序",
      keywords: ["垄断", "倾销", "补贴", "不正当竞争"],
      weight: -25,
      description: "检查是否存在垄断、倾销等违法行为",
      compliance: false
    },
    {
      article: "《对外贸易法》第29条 - 知识产权保护",
      keywords: ["知识产权", "商标", "专利", "版权"],
      weight: 10,
      description: "检查知识产权保护条款",
      compliance: true
    },
    {
      article: "《对外贸易法》第32条 - 对外贸易促进",
      keywords: ["促进", "支持", "鼓励", "政策"],
      weight: 5,
      description: "利用对外贸易促进政策",
      compliance: true
    }
  ];

  // 检查对外贸易法条例
  foreignTradeRegulations.forEach(regulation => {
    const hasKeyword = regulation.keywords.some(keyword => 
      textLower.includes(keyword.toLowerCase())
    );
    
    if (hasKeyword) {
      analysis.matched_articles.push({
        article: regulation.article,
        description: regulation.description,
        compliance: regulation.compliance,
        weight: regulation.weight
      });
      
      if (regulation.weight > 0) {
        score += regulation.weight;
      } else {
        score += regulation.weight;
        analysis.risk_factors.push({
          type: "合规风险",
          description: regulation.description,
          severity: "high",
          suggestion: "请确认相关条款是否符合对外贸易法要求"
        });
      }
    }
  });

  // 检查合同基本要素
  const contractElements = [
    { element: "甲方", weight: 5 },
    { element: "乙方", weight: 5 },
    { element: "合同", weight: 5 },
    { element: "协议", weight: 5 },
    { element: "签订", weight: 3 },
    { element: "生效", weight: 3 },
    { element: "履行", weight: 3 },
    { element: "违约责任", weight: 5 },
    { element: "争议解决", weight: 5 },
    { element: "仲裁", weight: 5 }
  ];

  contractElements.forEach(item => {
    if (text.includes(item.element)) {
      score += item.weight;
    }
  });

  // 检查风险词汇
  const riskWords = [
    { word: "走私", severity: "high", weight: -30 },
    { word: "逃税", severity: "high", weight: -30 },
    { word: "非法", severity: "medium", weight: -20 },
    { word: "违规", severity: "medium", weight: -15 },
    { word: "处罚", severity: "medium", weight: -10 },
    { word: "没收", severity: "high", weight: -25 },
    { word: "罚款", severity: "medium", weight: -15 }
  ];

  riskWords.forEach(item => {
    if (textLower.includes(item.word)) {
      analysis.risk_factors.push({
        type: "法律风险",
        description: `合同内容包含风险词汇: ${item.word}`,
        severity: item.severity,
        suggestion: "请仔细审查相关条款的合法性，必要时咨询专业律师"
      });
      score += item.weight;
    }
  });

  // 检查特定合规要求
  const complianceChecks = [
    {
      check: () => textLower.includes("电子产品") && textLower.includes("出口"),
      description: "电子产品出口需要确认是否符合相关技术标准",
      weight: -10,
      suggestion: "建议添加产品质量和技术标准条款"
    },
    {
      check: () => textLower.includes("美元") && textLower.includes("支付"),
      description: "美元支付需要符合外汇管理规定",
      weight: -5,
      suggestion: "建议明确外汇结算方式和合规要求"
    },
    {
      check: () => textLower.includes("信用证") && !textLower.includes("银行"),
      description: "信用证支付需要明确开证银行",
      weight: -10,
      suggestion: "建议明确开证银行和信用证条款"
    }
  ];

  complianceChecks.forEach(check => {
    if (check.check()) {
      analysis.risk_factors.push({
        type: "合规要求",
        description: check.description,
        severity: "medium",
        suggestion: check.suggestion
      });
      score += check.weight;
    }
  });

  // 生成改进建议
  generateSuggestions(analysis, score, text);

  // 生成分析摘要
  analysis.analysis_summary = generateAnalysisSummary(score, analysis.matched_articles.length, analysis.risk_factors.length);

  // 确保分数在合理范围内
  analysis.compliance_score = Math.max(0, Math.min(100, score));
  return analysis;
}

// 生成改进建议
function generateSuggestions(analysis, score, text) {
  const suggestions = [];

  // 基于分数生成建议
  if (score < 70) {
    suggestions.push("建议咨询专业律师进行合同审查");
    suggestions.push("确认所有进出口商品符合相关法规要求");
    suggestions.push("完善合同条款，明确各方责任和义务");
  } else if (score < 90) {
    suggestions.push("建议完善合同条款，确保合规性");
    suggestions.push("加强风险控制措施");
  } else {
    suggestions.push("合同基本符合对外贸易法要求");
    suggestions.push("建议定期审查合同条款，确保持续合规");
  }

  // 基于具体内容生成建议
  if (text.toLowerCase().includes("电子产品")) {
    suggestions.push("建议添加产品质量保证和技术标准条款");
  }

  if (text.toLowerCase().includes("美元") && text.toLowerCase().includes("支付")) {
    suggestions.push("建议明确外汇结算方式和合规要求");
  }

  if (text.toLowerCase().includes("信用证")) {
    suggestions.push("建议详细规定信用证条款和银行责任");
  }

  if (!text.includes("争议解决")) {
    suggestions.push("建议添加争议解决条款，明确仲裁或诉讼方式");
  }

  if (!text.includes("违约责任")) {
    suggestions.push("建议完善违约责任条款，明确赔偿标准");
  }

  // 去重并限制建议数量
  analysis.suggestions = [...new Set(suggestions)].slice(0, 8);
}

// 生成分析摘要
function generateAnalysisSummary(score, regulationsCount, riskCount) {
  let summary = `基础分析完成，合规评分${score}分。`;
  
  if (regulationsCount > 0) {
    summary += `涉及${regulationsCount}项对外贸易法相关条例。`;
  }
  
  if (riskCount > 0) {
    summary += `发现${riskCount}个风险因素需要关注。`;
  }
  
  if (score >= 90) {
    summary += "建议使用AI分析获得更准确结果。";
  } else if (score >= 70) {
    summary += "建议完善部分条款以提高合规性。";
  } else {
    summary += "建议咨询专业律师进行详细审查。";
  }
  
  return summary;
}

// 合同修改建议生成
function generateContractModifications(originalText, analysis) {
  let modifiedText = originalText;
  const modifications = [];

  // 基于风险因素生成修改建议
  analysis.risk_factors.forEach(risk => {
    if (risk.type === "合规要求") {
      switch (risk.description) {
        case "电子产品出口需要确认是否符合相关技术标准":
          if (!modifiedText.includes("质量标准")) {
            modifications.push({
              type: "add",
              position: "质量保证条款",
              content: "\n第六条 质量保证\n乙方保证所供电子产品符合中国相关技术标准和产品质量要求，并提供相应的质量证明文件。如发现质量问题，乙方应承担相应责任并负责退换货。"
            });
          }
          break;
        case "美元支付需要符合外汇管理规定":
          if (modifiedText.includes("美元") && modifiedText.includes("支付")) {
            modifications.push({
              type: "modify",
              search: "美元",
              replace: "美元（符合中国外汇管理规定）"
            });
          }
          break;
        case "信用证支付需要明确开证银行":
          if (modifiedText.includes("信用证") && !modifiedText.includes("开证银行")) {
            modifications.push({
              type: "add",
              position: "信用证条款",
              content: "\n信用证开证银行为双方认可的具有国际结算资格的银行，具体银行名称和信用证条款另行约定。"
            });
          }
          break;
      }
    }
  });

  // 检查并添加缺失的重要条款
  if (!modifiedText.includes("争议解决")) {
    modifications.push({
      type: "add",
      position: "争议解决条款",
      content: "\n第八条 争议解决\n因本合同引起的争议，双方应友好协商解决；协商不成的，提交中国国际经济贸易仲裁委员会仲裁。"
    });
  }

  if (!modifiedText.includes("违约责任")) {
    modifications.push({
      type: "add",
      position: "违约责任条款",
      content: "\n第七条 违约责任\n如任何一方违反本协议，应承担相应法律责任，并赔偿对方因此造成的损失。具体赔偿标准按照实际损失计算。"
    });
  }

  // 应用修改
  modifications.forEach(mod => {
    if (mod.type === "add") {
      // 在适当位置添加条款
      const insertPosition = findInsertPosition(modifiedText, mod.position);
      modifiedText = modifiedText.slice(0, insertPosition) + mod.content + modifiedText.slice(insertPosition);
    } else if (mod.type === "modify") {
      // 替换文本
      modifiedText = modifiedText.replace(mod.search, mod.replace);
    }
  });

  return {
    modified_text: modifiedText,
    modifications: modifications
  };
}

// 查找插入位置
function findInsertPosition(text, position) {
  const lines = text.split('\n');
  
  switch (position) {
    case "质量保证条款":
      // 在第六条之后插入
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("第六条")) {
          return text.indexOf(lines[i]) + lines[i].length + 1;
        }
      }
      break;
    case "争议解决条款":
      // 在合同末尾之前插入
      return text.lastIndexOf("日期：");
    case "违约责任条款":
      // 在第七条之前插入
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("第七条")) {
          return text.indexOf(lines[i]);
        }
      }
      break;
  }
  
  return text.length;
}

module.exports = {
  analyzeForeignTradeCompliance,
  generateContractModifications
}; 