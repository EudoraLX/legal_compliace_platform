const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    
    // 调试信息
    console.log('AI服务初始化:');
    console.log('API Key:', this.apiKey ? '已设置' : '未设置');
    console.log('Base URL:', this.baseURL);
    console.log('使用模型: deepseek/deepseek-chat-v3-0324 (OpenRouter)');
  }

  async analyzeContract(text) {
    try {
      const prompt = this.buildAnalysisPrompt(text);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "deepseek/deepseek-chat-v3-0324",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律合规分析师，专门分析合同是否符合《中华人民共和国对外贸易法》。请严格按照JSON格式返回分析结果，包含具体的法条原文对照。"
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
      console.log('AI原始响应:', aiResponse);
      return this.parseAIResponse(aiResponse, text);
    } catch (error) {
      console.error('AI分析失败:', error);
      // 如果AI分析失败，返回基础分析结果
      return this.fallbackAnalysis(text);
    }
  }

  buildAnalysisPrompt(text) {
    return `
请详细分析以下合同文本是否符合《中华人民共和国对外贸易法》的要求，并以JSON格式返回结果：

合同文本：
${text}

请按照以下JSON格式返回分析结果，必须包含具体的法条原文对照：

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
      "article": "《对外贸易法》第X条 - 具体条款名称",
      "description": "法条描述",
      "compliance": true,
      "original_text": "法条原文内容",
      "contract_reference": "合同中相关内容的引用",
      "analysis": "具体分析说明"
    }
  ],
  "analysis_summary": "总体分析摘要",
  "contract_modifications": [
    {
      "type": "add|modify|delete",
      "position": "修改位置",
      "original_text": "原文内容",
      "suggested_text": "建议修改内容",
      "reason": "修改原因",
      "related_article": "相关法条"
    }
  ]
}

请确保：
1. compliance_score 是0-100的整数
2. severity 只能是 "high", "medium", "low" 之一
3. 所有文本内容都是中文
4. 严格按照JSON格式返回，不要包含其他文字
5. 包含《对外贸易法》的具体条文原文
6. 提供合同修改建议，包含具体的修改内容
7. 分析要详细、准确，体现专业法律分析水平
`;
  }

  parseAIResponse(response, originalText) {
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
          contract_modifications: parsed.contract_modifications || []
        };

        // 如果没有匹配到条例，添加基础条例检查
        if (analysis.matched_articles.length === 0) {
          analysis.matched_articles = this.getBasicRegulations(originalText);
        }

        return analysis;
      }
    } catch (error) {
      console.error('解析AI响应失败:', error);
      console.error('原始响应:', response);
    }
    
    // 如果解析失败，返回基础分析
    return this.fallbackAnalysis(originalText);
  }

  getBasicRegulations(text) {
    const textLower = text.toLowerCase();
    const regulations = [];

    // 对外贸易法基础条例
    const basicRegulations = [
      {
        article: "《对外贸易法》第2条 - 适用范围",
        description: "本法适用于对外贸易以及与对外贸易有关的知识产权保护",
        keywords: ["对外贸易", "进出口", "货物", "技术", "服务"],
        original_text: "本法适用于对外贸易以及与对外贸易有关的知识产权保护。本法所称对外贸易，是指货物进出口、技术进出口和国际服务贸易。"
      },
      {
        article: "《对外贸易法》第3条 - 对外贸易经营者",
        description: "从事货物进出口或者技术进出口的对外贸易经营者，应当向国务院对外贸易主管部门或者其委托的机构办理备案登记",
        keywords: ["经营者", "登记", "备案", "资格"],
        original_text: "从事货物进出口或者技术进出口的对外贸易经营者，应当向国务院对外贸易主管部门或者其委托的机构办理备案登记；但是，法律、行政法规和国务院对外贸易主管部门规定不需要备案登记的除外。"
      },
      {
        article: "《对外贸易法》第15条 - 货物进出口管理",
        description: "国家基于下列原因，可以限制或者禁止有关货物、技术的进口或者出口",
        keywords: ["许可证", "配额", "限制", "禁止"],
        original_text: "国家基于下列原因，可以限制或者禁止有关货物、技术的进口或者出口：（一）为维护国家安全、社会公共利益或者公共道德，需要限制或者禁止进口或者出口的；（二）为保护人的健康或者安全，保护动物、植物的生命或者健康，保护环境，需要限制或者禁止进口或者出口的；（三）为实施与黄金或者白银进出口有关的措施，需要限制或者禁止进口或者出口的；（四）国内供应短缺或者为有效保护可能用竭的自然资源，需要限制禁止出口的；（五）输往国家或者地区的市场容量有限，需要限制出口的；（六）出口经营秩序出现严重混乱，需要限制出口的；（七）为建立或者加快建立国内特定产业，需要限制进口的；（八）对任何形式的农业、牧业、渔业产品有必要限制进口的；（九）为保障国家国际金融地位和国际收支平衡，需要限制进口的；（十）依照法律、行政法规的规定，其他需要限制或者禁止进口或者出口的；（十一）根据我国缔结或者参加的国际条约、协定的规定，其他需要限制或者禁止进口或者出口的。"
      },
      {
        article: "《对外贸易法》第16条 - 技术进出口管理",
        description: "国家基于维护国家安全、社会公共利益或者公共道德等原因，可以限制或者禁止有关技术的进口或者出口",
        keywords: ["技术", "专利", "专有技术", "技术转让"],
        original_text: "国家基于维护国家安全、社会公共利益或者公共道德等原因，可以限制或者禁止有关技术的进口或者出口。"
      },
      {
        article: "《对外贸易法》第19条 - 国际服务贸易",
        description: "国家基于维护国家安全、社会公共利益或者公共道德等原因，可以限制或者禁止有关的国际服务贸易",
        keywords: ["服务", "咨询", "代理", "运输"],
        original_text: "国家基于维护国家安全、社会公共利益或者公共道德等原因，可以限制或者禁止有关的国际服务贸易。"
      },
      {
        article: "《对外贸易法》第23条 - 对外贸易秩序",
        description: "在对外贸易经营活动中，不得实施垄断行为，不得进行不正当竞争",
        keywords: ["垄断", "倾销", "补贴", "不正当竞争"],
        original_text: "在对外贸易经营活动中，不得实施垄断行为，不得进行不正当竞争。"
      },
      {
        article: "《对外贸易法》第29条 - 知识产权保护",
        description: "国家依照有关知识产权的法律、行政法规，保护与对外贸易有关的知识产权",
        keywords: ["知识产权", "商标", "专利", "版权"],
        original_text: "国家依照有关知识产权的法律、行政法规，保护与对外贸易有关的知识产权。"
      },
      {
        article: "《对外贸易法》第32条 - 对外贸易促进",
        description: "国家制定对外贸易发展战略，建立和完善对外贸易促进机制",
        keywords: ["促进", "支持", "鼓励", "政策"],
        original_text: "国家制定对外贸易发展战略，建立和完善对外贸易促进机制。"
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

  fallbackAnalysis(text) {
    // 基础分析逻辑（当AI不可用时使用）
    const analysis = {
      compliance_score: 70,
      risk_factors: [],
      suggestions: ["建议咨询专业律师进行详细审查"],
      matched_articles: this.getBasicRegulations(text),
      analysis_summary: "基础分析完成，建议使用AI分析获得更准确结果",
      contract_modifications: []
    };

    const textLower = text.toLowerCase();
    
    // 简单的关键词检查
    if (textLower.includes("禁止") || textLower.includes("限制")) {
      analysis.risk_factors.push({
        type: "合规风险",
        description: "合同涉及禁止或限制进出口商品",
        severity: "high",
        suggestion: "请确认相关商品是否在禁止或限制进出口目录中",
        related_articles: ["《对外贸易法》第15条"]
      });
      analysis.compliance_score -= 20;
    }

    if (textLower.includes("走私") || textLower.includes("逃税")) {
      analysis.risk_factors.push({
        type: "法律风险",
        description: "合同内容包含高风险词汇",
        severity: "high",
        suggestion: "请仔细审查相关条款的合法性",
        related_articles: ["《对外贸易法》第23条"]
      });
      analysis.compliance_score -= 30;
    }

    return analysis;
  }

  async generateContractModifications(originalText, analysis) {
    try {
      const prompt = this.buildModificationPrompt(originalText, analysis);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "deepseek/deepseek-chat-v3-0324",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律合同修改专家，专门根据《中华人民共和国对外贸易法》的要求修改合同条款。请提供具体的修改建议。"
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
  "modified_text": "修改后的完整合同文本",
  "modifications": [
    {
      "type": "add|modify|delete",
      "position": "修改位置描述",
      "original_text": "原文内容",
      "suggested_text": "建议修改内容",
      "reason": "修改原因",
      "related_article": "相关法条"
    }
  ],
  "summary": "修改总结"
}

请确保：
1. 修改建议符合《对外贸易法》要求
2. 提供具体的修改内容，不仅仅是建议
3. 保持合同结构的完整性
4. 所有修改都要有明确的法律依据
5. 严格按照JSON格式返回
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

    // 基于风险因素生成基础修改建议
    if (analysis.risk_factors) {
      analysis.risk_factors.forEach(risk => {
        if (risk.type === "合规要求") {
          switch (risk.description) {
            case "电子产品出口需要确认是否符合相关技术标准":
              if (!modifiedText.includes("质量标准")) {
                modifications.push({
                  type: "add",
                  position: "质量保证条款",
                  original_text: "",
                  suggested_text: "乙方保证所供电子产品符合中国相关技术标准和产品质量要求，并提供相应的质量证明文件。",
                  reason: "符合《对外贸易法》第15条要求",
                  related_article: "《对外贸易法》第15条"
                });
              }
              break;
          }
        }
      });
    }

    return {
      modified_text: modifiedText,
      modifications: modifications,
      summary: "基础修改建议"
    };
  }
}

module.exports = new AIService(); 