const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    
    // 调试信息
    console.log('AI服务初始化:');
    console.log('API Key:', this.apiKey ? '已设置' : '未设置');
    console.log('Base URL:', this.baseURL);
    console.log('使用模型: anthropic/claude-opus-4.1 (OpenRouter)');
  }

  async analyzeContract(text) {
    try {
      const prompt = this.buildUnifiedAnalysisPrompt(text);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律合规分析师和合同优化专家，专门分析合同的法律合规性并提供优化建议。请严格按照JSON格式返回分析结果，包含具体的法条原文对照和合同优化建议。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 6000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Legal Contract Compliance AI'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      console.log('AI原始响应:', aiResponse);
      return this.parseUnifiedAIResponse(aiResponse, text);
    } catch (error) {
      console.error('AI分析失败:', error);
      // 如果AI分析失败，返回基础分析结果
      return this.fallbackUnifiedAnalysis(text);
    }
  }

  buildUnifiedAnalysisPrompt(text) {
    return `
请详细分析以下合同文本的法律合规性，并提供优化建议。请以JSON格式返回结果：

合同文本：
${text}

请按照以下JSON格式返回分析结果，必须包含具体的法条原文对照和合同优化建议：

{
  "compliance_score": 85,
  "risk_factors": [
    {
      "type": "合规风险",
      "description": "具体风险描述",
      "severity": "high|medium|low",
      "suggestion": "改进建议",
      "related_articles": ["相关法条编号"]
    }
  ],
  "suggestions": [
    "具体改进建议1",
    "具体改进建议2"
  ],
  "matched_articles": [
    {
      "article": "具体法条名称（如：《合同法》第X条、《公司法》第X条等）",
      "description": "法条描述",
      "compliance": true,
      "original_text": "法条原文内容",
      "contract_reference": "合同中相关内容的引用",
      "analysis": "具体分析说明"
    }
  ],
  "analysis_summary": "总体分析摘要",
  "contract_optimization": {
    "optimized_text": "优化后的完整合同文本（必须与原文有明显差异，体现法律合规性改进）",
    "modifications": [
      {
        "type": "add|modify|delete",
        "position": "具体条款位置（如：第一条、第二条等）",
        "original_text": "原文中需要修改的具体内容（必须准确引用原文，不能为空）",
        "optimized_text": "优化后的具体内容（必须与原文不同，体现法律改进）",
        "reason": "详细的优化原因和法律依据（必须引用具体法条，说明为什么需要优化）",
        "related_article": "相关的法律条款编号和具体内容（如：《合同法》第X条、《公司法》第X条等）",
        "highlight_start": 0,
        "highlight_end": 100,
        "highlight_type": "add|modify|delete|warning|success|info"
      }
    ],
    "summary": "优化总结和主要改进点"
  }
}

重要要求：
1. compliance_score 是0-100的整数
2. severity 只能是 "high", "medium", "low" 之一
3. 所有文本内容都是中文
4. 严格按照JSON格式返回，不要包含其他文字
5. 包含具体法律条文原文，不限于特定法律
6. 提供合同修改建议，包含具体的修改内容
7. 分析要详细、准确，体现专业法律分析水平
8. 重点关注合同条款的合法性、完整性和风险控制
9. 优化后的文本必须与原文有明显差异
10. 每个修改都要有具体的法律条文支撑
11. 为每个修改添加高亮信息（highlight_start, highlight_end, highlight_type）
12. highlight_type 用于前端展示不同类型的高亮效果
`;
  }

  parseUnifiedAIResponse(response, originalText) {
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 验证和清理数据
        const analysis = {
          compliance_score: Math.max(0, Math.min(100, parseInt(parsed.compliance_score) || 0)),
          risk_factors: parsed.risk_factors || [],
          suggestions: parsed.suggestions || [],
          matched_articles: parsed.matched_articles || [],
          analysis_summary: parsed.analysis_summary || "AI分析完成",
          contract_optimization: parsed.contract_optimization || {}
        };

        // 如果没有匹配到条例，添加基础条例检查
        if (analysis.matched_articles.length === 0) {
          analysis.matched_articles = this.getBasicRegulations(originalText);
        }

        // 处理合同优化部分
        if (analysis.contract_optimization) {
          analysis.contract_optimization.optimized_text = 
            analysis.contract_optimization.optimized_text || originalText;
          analysis.contract_optimization.modifications = 
            analysis.contract_optimization.modifications || [];
          analysis.contract_optimization.summary = 
            analysis.contract_optimization.summary || "AI优化建议";
        }

        return analysis;
      }
    } catch (error) {
      console.error('解析AI响应失败:', error);
      console.error('原始响应:', response);
    }
    
    // 如果解析失败，返回基础分析
    return this.fallbackUnifiedAnalysis(originalText);
  }

  getBasicRegulations(text) {
    const textLower = text.toLowerCase();
    const regulations = [];

    // 基础法律条例（不限于对外贸易法）
    const basicRegulations = [
      {
        article: "《合同法》第3条 - 合同基本原则",
        description: "合同当事人的法律地位平等，一方不得将自己的意志强加给另一方",
        keywords: ["合同", "协议", "约定", "条款"],
        original_text: "合同当事人的法律地位平等，一方不得将自己的意志强加给另一方。"
      },
      {
        article: "《合同法》第8条 - 合同效力",
        description: "依法成立的合同，对当事人具有法律约束力",
        keywords: ["法律约束力", "合同效力", "依法成立"],
        original_text: "依法成立的合同，对当事人具有法律约束力。当事人应当按照约定履行自己的义务，不得擅自变更或者解除合同。"
      },
      {
        article: "《合同法》第12条 - 合同内容",
        description: "合同的内容由当事人约定，一般包括当事人的名称或者姓名和住所等条款",
        keywords: ["当事人", "名称", "住所", "标的", "数量", "质量"],
        original_text: "合同的内容由当事人约定，一般包括当事人的名称或者姓名和住所；标的；数量；质量；价款或者报酬；履行期限、地点和方式；违约责任；解决争议的方法等条款。"
      },
      {
        article: "《合同法》第60条 - 全面履行原则",
        description: "当事人应当按照约定全面履行自己的义务",
        keywords: ["全面履行", "义务", "约定"],
        original_text: "当事人应当按照约定全面履行自己的义务。当事人应当遵循诚实信用原则，根据合同的性质、目的和交易习惯履行通知、协助、保密等义务。"
      },
      {
        article: "《合同法》第107条 - 违约责任",
        description: "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任",
        keywords: ["违约责任", "不履行", "赔偿损失", "补救措施"],
        original_text: "当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。"
      },
      {
        article: "《公司法》第3条 - 公司责任",
        description: "公司是企业法人，有独立的法人财产，享有法人财产权",
        keywords: ["公司", "企业法人", "法人财产", "责任"],
        original_text: "公司是企业法人，有独立的法人财产，享有法人财产权。公司以其全部财产对公司的债务承担责任。"
      },
      {
        article: "《民法典》第143条 - 民事法律行为效力",
        description: "具备下列条件的民事法律行为有效：行为人具有相应的民事行为能力；意思表示真实；不违反法律、行政法规的强制性规定，不违背公序良俗",
        keywords: ["民事行为能力", "意思表示", "法律强制性规定", "公序良俗"],
        original_text: "具备下列条件的民事法律行为有效：（一）行为人具有相应的民事行为能力；（二）意思表示真实；（三）不违反法律、行政法规的强制性规定，不违背公序良俗。"
      }
    ];

    basicRegulations.forEach(regulation => {
      const hasKeyword = regulation.keywords.some(keyword => 
        textLower.includes(keyword.toLowerCase())
      );
      
      if (hasKeyword) {
        regulations.push({
          article: regulation.article,
          description: regulation.description,
          compliance: true,
          original_text: regulation.original_text,
          contract_reference: this.findContractReference(text, regulation.keywords),
          analysis: `合同内容涉及${regulation.description}`
        });
      }
    });

    return regulations;
  }

  findContractReference(text, keywords) {
    const lines = text.split('\n');
    for (let line of lines) {
      const lineLower = line.toLowerCase();
      if (keywords.some(keyword => lineLower.includes(keyword.toLowerCase()))) {
        return line.trim();
      }
    }
    return "相关内容在合同中";
  }

  fallbackUnifiedAnalysis(text) {
    // 基础分析逻辑（当AI不可用时使用）
    const analysis = {
      compliance_score: 70,
      risk_factors: [],
      suggestions: ["建议咨询专业律师进行详细审查"],
      matched_articles: this.getBasicRegulations(text),
      analysis_summary: "基础分析完成，建议使用AI分析获得更准确结果",
      contract_optimization: {
        optimized_text: text,
        modifications: [],
        summary: "基础优化建议"
      }
    };

    const textLower = text.toLowerCase();
    
    // 简单的关键词检查
    if (textLower.includes("无效") || textLower.includes("违法")) {
      analysis.risk_factors.push({
        type: "法律风险",
        description: "合同内容包含无效或违法条款",
        severity: "high",
        suggestion: "请仔细审查相关条款的合法性",
        related_articles: ["《民法典》第143条"]
      });
      analysis.compliance_score -= 20;
    }

    if (textLower.includes("不平等") || textLower.includes("强制")) {
      analysis.risk_factors.push({
        type: "合同风险",
        description: "合同条款可能存在不平等或强制性内容",
        severity: "medium",
        suggestion: "请确保合同条款的公平性和合法性",
        related_articles: ["《合同法》第3条"]
      });
      analysis.compliance_score -= 15;
    }

    if (textLower.includes("违约责任") && !textLower.includes("赔偿")) {
      analysis.risk_factors.push({
        type: "条款缺失",
        description: "合同缺少明确的违约责任和赔偿条款",
        severity: "medium",
        suggestion: "建议增加明确的违约责任和赔偿标准",
        related_articles: ["《合同法》第107条"]
      });
      analysis.compliance_score -= 10;
    }

    // 生成基础优化建议
    analysis.contract_optimization.modifications = this.generateFallbackModifications(text);

    return analysis;
  }

  async generateContractModifications(originalText, analysis) {
    try {
      const prompt = this.buildModificationPrompt(originalText, analysis);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
                         {
               role: "system",
               content: "你是一个专业的法律合同修改专家，专门根据中国相关法律法规的要求修改合同条款。请提供具体的修改建议。"
             },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 3000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Legal Contract Compliance AI'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      return this.parseModificationResponse(aiResponse, originalText);
    } catch (error) {
      console.error('AI合同修改失败:', error);
      return this.fallbackModifications(originalText, analysis);
    }
  }

  buildModificationPrompt(originalText, analysis) {
    return `
基于以下合同文本和AI分析结果，请提供具体的合同修改建议：

原始合同文本：
${originalText}

AI分析结果：
${JSON.stringify(analysis, null, 2)}

请按照以下JSON格式返回修改建议：

{
  "modified_text": "修改后的完整合同文本（必须与原文有明显差异）",
  "modifications": [
    {
      "type": "add|modify|delete",
      "position": "修改位置描述",
      "original_text": "原文内容（必须准确引用原文）",
      "suggested_text": "建议修改内容（必须与原文不同）",
      "reason": "详细的修改原因和法律依据（必须引用具体法条）",
      "related_article": "相关的法律条款编号和内容"
    }
  ],
  "summary": "修改总结和主要改进点"
}

重要要求：
1. 修改建议必须符合相关法律法规要求
2. 提供具体的修改内容，不仅仅是建议
3. 保持合同结构的完整性
4. 所有修改都要有明确的法律依据，引用具体法条
5. 严格按照JSON格式返回
6. 修改后的文本必须与原文有明显差异
7. 重点关注合同条款的合法性、完整性和风险控制
8. 每个修改都要有具体的法律条文支撑
`;
  }

  parseModificationResponse(response, originalText) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          modified_text: parsed.modified_text || originalText,
          modifications: parsed.modifications || [],
          summary: parsed.summary || "AI修改建议"
        };
      }
    } catch (error) {
      console.error('解析修改响应失败:', error);
    }
    
    return this.fallbackModifications(originalText, {});
  }

  fallbackModifications(originalText, analysis) {
    let modifiedText = originalText;
    const modifications = [];

    // 基于合同内容分析生成基础修改建议
    const textLower = originalText.toLowerCase();
    
    // 检查违约责任条款
    if (textLower.includes("违约责任") && textLower.includes("双方协商确定")) {
      modifications.push({
        type: "modify",
        position: "违约责任条款",
        original_text: "如任何一方违反本协议，应承担相应法律责任，具体赔偿金额双方协商确定。",
        suggested_text: "如任何一方违反本协议，应承担相应法律责任。具体赔偿金额按照实际损失计算，最低不低于合同总金额的10%。",
        reason: "根据《合同法》第107条，当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
        related_article: "《合同法》第107条"
      });
    }
    
    // 检查合同主体条款
    if (textLower.includes("甲方") && textLower.includes("乙方") && !textLower.includes("住所")) {
      modifications.push({
        type: "add",
        position: "合同主体条款",
        original_text: "",
        suggested_text: "甲方：\n住所：\n法定代表人：\n联系电话：\n\n乙方：\n住所：\n法定代表人：\n联系电话：",
        reason: "根据《合同法》第12条，合同的内容由当事人约定，一般包括当事人的名称或者姓名和住所等条款。",
        related_article: "《合同法》第12条"
      });
    }
    
    // 检查争议解决条款
    if (!textLower.includes("争议解决") && !textLower.includes("纠纷")) {
      modifications.push({
        type: "add",
        position: "争议解决条款",
        original_text: "",
        suggested_text: "因本合同引起的或与本合同有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向合同签订地人民法院提起诉讼。",
        reason: "根据《合同法》第12条，合同的内容一般包括解决争议的方法等条款。",
        related_article: "《合同法》第12条"
      });
    }
    
    // 检查质量条款
    if (textLower.includes("质量") && textLower.includes("以样品为准")) {
      modifications.push({
        type: "modify",
        position: "质量要求条款",
        original_text: "商品质量以乙方提供的样品为准。",
        suggested_text: "商品质量必须符合国家相关技术标准和产品质量要求，同时不低于乙方提供的样品标准。",
        reason: "根据《合同法》第60条，当事人应当按照约定全面履行自己的义务，应当遵循诚实信用原则。",
        related_article: "《合同法》第60条"
      });
    }
    
    // 如果没有识别到具体问题，提供通用建议
    if (modifications.length === 0) {
      modifications.push({
        type: "add",
        position: "法律声明条款",
        original_text: "",
        suggested_text: "双方承诺严格遵守中华人民共和国相关法律法规要求，确保所有合同条款合法有效。",
        reason: "根据《民法典》第143条，民事法律行为必须不违反法律、行政法规的强制性规定，不违背公序良俗。",
        related_article: "《民法典》第143条"
      });
    }

    // 生成修改后的文本
    modifiedText = this.applyModificationsToText(originalText, modifications);

    return {
      modified_text: modifiedText,
      modifications: modifications,
      summary: "基于相关法律法规的合规性修改建议"
    };
  }

  // AI智能修改建议（新功能）
  async generateAISmartModifications(originalText, analysis) {
    try {
      const prompt = this.buildAISmartModificationPrompt(originalText, analysis);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
                         {
               role: "system",
               content: "你是一个专业的法律合同AI修改专家，专门根据中国相关法律法规的要求，提供智能化的合同修改建议。请仔细分析原文与建议修改的差异，并提供详细的修改原因和法律依据。"
             },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Legal Contract Compliance AI'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      return this.parseAISmartModificationResponse(aiResponse, originalText);
    } catch (error) {
      console.error('AI智能修改建议失败:', error);
      return this.fallbackAISmartModifications(originalText, analysis);
    }
  }

  buildAISmartModificationPrompt(originalText, analysis) {
    return `
你是一个专业的法律合同优化专家。请直接优化以下合同文本，生成一份更加合规、完整的合同协议。

原始合同文本：
${originalText}

AI分析结果：
${JSON.stringify(analysis, null, 2)}

请直接优化原合同，生成一份新的合规合同，并按照以下JSON格式返回：

{
  "modified_text": "优化后的完整合同文本（必须与原文有明显差异，体现法律合规性改进）",
  "modifications": [
    {
      "type": "add|modify|delete",
      "position": "具体条款位置（如：第一条、第二条等）",
      "original_text": "原文中需要修改的具体内容（必须准确引用原文，不能为空）",
      "suggested_text": "优化后的具体内容（必须与原文不同，体现法律改进）",
      "reason": "详细的优化原因和法律依据（必须引用具体法条，说明为什么需要优化）",
      "related_article": "相关的法律条款编号和具体内容（如：《合同法》第X条、《公司法》第X条等）"
    }
  ],
  "summary": "优化总结和主要改进点"
}

重要要求：
1. 必须严格按照JSON格式返回，不要包含其他文字
2. 直接优化原合同，生成一份新的合规合同，不要受限于预设规则
3. 每个修改都要有明确的原文内容对比，不能与原文完全一样
4. 优化原因要详细说明法律依据，引用具体法条
5. 优化内容要具体可操作，不能是空泛的建议
6. 必须识别出合同中的具体问题并提供解决方案
7. 重点关注合同条款的合法性、完整性和风险控制
8. 如果原文有问题，必须提供明确的优化方案
9. 优化后的文本要与原文有明显差异
10. 每个优化都要有具体的法律条文支撑
11. 确保优化后的合同更加合法、完整和风险可控
12. 保持原合同的基本结构和主要条款，只进行必要的法律合规性优化
`;
  }

  parseAISmartModificationResponse(response, originalText) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          modified_text: parsed.modified_text || originalText,
          modifications: parsed.modifications || [],
          summary: parsed.summary || "AI智能修改建议"
        };
      }
    } catch (error) {
      console.error('解析AI智能修改响应失败:', error);
    }
    
    return this.fallbackAISmartModifications(originalText, {});
  }

  fallbackAISmartModifications(originalText, analysis) {
    let modifiedText = originalText;
    const modifications = [];

    // 基于合同内容分析生成智能修改建议
    const textLower = originalText.toLowerCase();
    
    // 检查违约责任条款
    if (textLower.includes("违约责任") && textLower.includes("双方协商确定")) {
      modifications.push({
        type: "modify",
        position: "违约责任条款",
        original_text: "如任何一方违反本协议，应承担相应法律责任，具体赔偿金额双方协商确定。",
        suggested_text: "如任何一方违反本协议，应承担相应法律责任。具体赔偿金额按照实际损失计算，最低不低于合同总金额的10%。",
        reason: "根据《合同法》第107条，当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
        related_article: "《合同法》第107条"
      });
    }
    
    // 检查合同主体条款
    if (textLower.includes("甲方") && textLower.includes("乙方") && !textLower.includes("住所")) {
      modifications.push({
        type: "add",
        position: "合同主体条款",
        original_text: "",
        suggested_text: "甲方：\n住所：\n法定代表人：\n联系电话：\n\n乙方：\n住所：\n法定代表人：\n联系电话：",
        reason: "根据《合同法》第12条，合同的内容由当事人约定，一般包括当事人的名称或者姓名和住所等条款。",
        related_article: "《合同法》第12条"
      });
    }
    
    // 检查争议解决条款
    if (!textLower.includes("争议解决") && !textLower.includes("纠纷")) {
      modifications.push({
        type: "add",
        position: "争议解决条款",
        original_text: "",
        suggested_text: "因本合同引起的或与本合同有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向合同签订地人民法院提起诉讼。",
        reason: "根据《合同法》第12条，合同的内容一般包括解决争议的方法等条款。",
        related_article: "《合同法》第12条"
      });
    }
    
    // 检查质量条款
    if (textLower.includes("质量") && textLower.includes("以样品为准")) {
      modifications.push({
        type: "modify",
        position: "质量要求条款",
        original_text: "商品质量以乙方提供的样品为准。",
        suggested_text: "商品质量必须符合国家相关技术标准和产品质量要求，同时不低于乙方提供的样品标准。",
        reason: "根据《合同法》第60条，当事人应当按照约定全面履行自己的义务，应当遵循诚实信用原则。",
        related_article: "《合同法》第60条"
      });
    }
    
    // 如果没有识别到具体问题，提供通用建议
    if (modifications.length === 0) {
      modifications.push({
        type: "add",
        position: "法律声明条款",
        original_text: "",
        suggested_text: "双方承诺严格遵守中华人民共和国相关法律法规要求，确保所有合同条款合法有效。",
        reason: "根据《民法典》第143条，民事法律行为必须不违反法律、行政法规的强制性规定，不违背公序良俗。",
        related_article: "《民法典》第143条"
      });
    }

    // 生成修改后的文本
    modifiedText = this.applyModificationsToText(originalText, modifications);

    return {
      modified_text: modifiedText,
      modifications: modifications,
      summary: "基于相关法律法规的合规性修改建议"
    };
  }

  generateFallbackModifications(text) {
    const modifications = [];
    const textLower = text.toLowerCase();
    
    // 检查违约责任条款
    if (textLower.includes("违约责任") && textLower.includes("双方协商确定")) {
      modifications.push({
        type: "modify",
        position: "违约责任条款",
        original_text: "如任何一方违反本协议，应承担相应法律责任，具体赔偿金额双方协商确定。",
        optimized_text: "如任何一方违反本协议，应承担相应法律责任。具体赔偿金额按照实际损失计算，最低不低于合同总金额的10%。",
        reason: "根据《合同法》第107条，当事人一方不履行合同义务或者履行合同义务不符合约定的，应当承担继续履行、采取补救措施或者赔偿损失等违约责任。",
        related_article: "《合同法》第107条",
        highlight_start: 0,
        highlight_end: 100,
        highlight_type: "modify"
      });
    }
    
    // 检查合同主体条款
    if (textLower.includes("甲方") && textLower.includes("乙方") && !textLower.includes("住所")) {
      modifications.push({
        type: "add",
        position: "合同主体条款",
        original_text: "",
        optimized_text: "甲方：\n住所：\n法定代表人：\n联系电话：\n\n乙方：\n住所：\n法定代表人：\n联系电话：",
        reason: "根据《合同法》第12条，合同的内容由当事人约定，一般包括当事人的名称或者姓名和住所等条款。",
        related_article: "《合同法》第12条",
        highlight_start: 0,
        highlight_end: 100,
        highlight_type: "add"
      });
    }
    
    // 检查争议解决条款
    if (!textLower.includes("争议解决") && !textLower.includes("纠纷")) {
      modifications.push({
        type: "add",
        position: "争议解决条款",
        original_text: "",
        optimized_text: "因本合同引起的或与本合同有关的任何争议，双方应友好协商解决；协商不成的，任何一方均可向合同签订地人民法院提起诉讼。",
        reason: "根据《合同法》第12条，合同的内容一般包括解决争议的方法等条款。",
        related_article: "《合同法》第12条",
        highlight_start: 0,
        highlight_end: 100,
        highlight_type: "add"
      });
    }
    
    // 如果没有识别到具体问题，提供通用建议
    if (modifications.length === 0) {
      modifications.push({
        type: "add",
        position: "法律声明条款",
        original_text: "",
        optimized_text: "双方承诺严格遵守中华人民共和国相关法律法规要求，确保所有合同条款合法有效。",
        reason: "根据《民法典》第143条，民事法律行为必须不违反法律、行政法规的强制性规定，不违背公序良俗。",
        related_article: "《民法典》第143条",
        highlight_start: 0,
        highlight_end: 100,
        highlight_type: "add"
      });
    }

    return modifications;
  }

  generateSuggestedText(risk) {
    switch (risk.type) {
             case "合规要求":
         return `乙方承诺严格遵守中华人民共和国相关法律法规要求，确保所有交易活动符合中国法律法规。`;
      case "质量风险":
        return `乙方保证所供产品符合合同约定的质量标准，并提供相应的质量证明文件。如出现质量问题，乙方承担相应责任。`;
      case "支付风险":
        return `双方约定采用安全的支付方式，建议使用信用证或银行保函等保障措施，降低支付风险。`;
      default:
        return `基于${risk.type}分析，建议在合同中增加相应的风险控制条款。`;
    }
  }

  // 应用修改到文本的辅助函数
  applyModificationsToText(originalText, modifications) {
    let modifiedText = originalText;
    
    // 按照位置排序，从后往前修改，避免位置偏移
    const sortedModifications = modifications.sort((a, b) => {
      const aPos = originalText.indexOf(a.original_text);
      const bPos = originalText.indexOf(b.original_text);
      return bPos - aPos;
    });
    
    sortedModifications.forEach(mod => {
      if (mod.type === 'modify' && mod.original_text && mod.suggested_text) {
        modifiedText = modifiedText.replace(mod.original_text, mod.suggested_text);
      } else if (mod.type === 'add' && mod.suggested_text) {
                 // 在适当位置添加新条款
         if (mod.position.includes("法律声明")) {
           modifiedText += `\n\n第九条 法律声明\n${mod.suggested_text}`;
         } else {
          modifiedText += `\n\n${mod.suggested_text}`;
        }
      }
    });
    
    return modifiedText;
  }
}

module.exports = new AIService(); 