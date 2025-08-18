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

  // 第一步：法律合规分析
  async analyzeLegalCompliance(text, primaryLaw = 'china', secondaryLaw = null) {
    try {
      const prompt = this.buildLegalAnalysisPrompt(text, primaryLaw, secondaryLaw);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律合规分析师，专门分析合同的法律合规性。请严格按照JSON格式返回分析结果。"
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
      console.log('法律分析AI响应:', aiResponse);
      return this.parseLegalAnalysisResponse(aiResponse);
    } catch (error) {
      console.error('法律分析失败:', error);
      throw new Error(`法律分析失败: ${error.message}`);
    }
  }

  // 第二步：合同优化修改
  async optimizeContract(text, legalAnalysis, primaryLaw = 'china', secondaryLaw = null) {
    try {
      const prompt = this.buildOptimizationPrompt(text, legalAnalysis, primaryLaw, secondaryLaw);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的合同优化专家，专门根据法律分析结果优化合同条款。请严格按照JSON格式返回优化结果。"
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
      console.log('合同优化AI响应:', aiResponse);
      return this.parseOptimizationResponse(aiResponse);
    } catch (error) {
      console.error('合同优化失败:', error);
      // 返回部分结果，而不是完全失败
      return {
        optimized_text: text, // 使用原文作为备选
        modifications: [],
        summary: "合同优化失败，使用原文",
        status: 'failed',
        error: error.message
      };
    }
  }

  // 第三步：合同翻译
  async translateContract(optimizedText, targetLanguage = 'en', primaryLaw = 'china', secondaryLaw = null) {
    try {
      const prompt = this.buildTranslationPrompt(optimizedText, targetLanguage, primaryLaw, secondaryLaw);
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律翻译专家，专门翻译法律合同。请严格按照JSON格式返回翻译结果。"
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
      console.log('合同翻译AI响应:', aiResponse);
      return this.parseTranslationResponse(aiResponse);
    } catch (error) {
      console.error('合同翻译失败:', error);
      // 返回部分结果，而不是完全失败
      return {
        target_language: targetLanguage,
        translated_text: optimizedText, // 使用原文作为备选
        translated_modifications: [],
        status: 'failed',
        error: error.message
      };
    }
  }

  // 完整的合同分析流程（支持部分失败）
  async analyzeContractComplete(text, primaryLaw = 'china', secondaryLaw = null, sendStepResult = null) {
    const result = {
      steps: {
        legal_analysis: { status: 'pending', data: null, error: null },
        optimization: { status: 'pending', data: null, error: null },
        translation: { status: 'pending', data: null, error: null }
      },
      summary: {
        total_steps: 3,
        completed_steps: 0,
        failed_steps: 0,
        can_retry: []
      }
    };

    try {
      // 第一步：法律合规分析
      console.log('开始第一步：法律合规分析...');
      try {
        const legalAnalysis = await this.analyzeLegalCompliance(text, primaryLaw, secondaryLaw);
        result.steps.legal_analysis = { status: 'completed', data: legalAnalysis, error: null };
        result.summary.completed_steps++;
        console.log('第一步完成：法律合规分析');
        
        // 发送步骤结果
        if (sendStepResult) {
          sendStepResult('legal_analysis', legalAnalysis);
        }
      } catch (error) {
        result.steps.legal_analysis = { status: 'failed', data: null, error: error.message };
        result.summary.failed_steps++;
        result.summary.can_retry.push('legal_analysis');
        console.error('第一步失败：法律合规分析', error.message);
      }

      // 第二步：合同优化修改（基于第一步的法律分析结果）
      console.log('开始第二步：合同优化修改...');
      try {
        const legalData = result.steps.legal_analysis.data;
        if (!legalData) {
          throw new Error('需要先完成法律分析才能进行合同优化');
        }
        
        // 构建包含法律分析结果的优化提示词
        const optimizationPrompt = this.buildOptimizationPromptWithContext(text, legalData, primaryLaw, secondaryLaw);
        const contractOptimization = await this.optimizeContractWithContext(text, optimizationPrompt);
        
        result.steps.optimization = { status: 'completed', data: contractOptimization, error: null };
        result.summary.completed_steps++;
        console.log('第二步完成：合同优化修改');
        
        // 发送步骤结果
        if (sendStepResult) {
          sendStepResult('optimization', contractOptimization);
        }
      } catch (error) {
        result.steps.optimization = { status: 'failed', data: null, error: error.message };
        result.summary.failed_steps++;
        result.summary.can_retry.push('optimization');
        console.error('第二步失败：合同优化修改', error.message);
      }

      // 第三步：合同翻译（基于第二步的优化结果）
      console.log('开始第三步：合同翻译...');
      try {
        const optimizedText = result.steps.optimization.data?.optimized_text || text;
        const legalData = result.steps.legal_analysis.data;
        
        // 构建包含法律背景的翻译提示词
        const translationPrompt = this.buildTranslationPromptWithContext(optimizedText, 'en', legalData, primaryLaw, secondaryLaw);
        const translation = await this.translateContractWithContext(translationPrompt);
        
        result.steps.translation = { status: 'completed', data: translation, error: null };
        result.summary.completed_steps++;
        console.log('第三步完成：合同翻译');
        
        // 发送步骤结果
        if (sendStepResult) {
          sendStepResult('translation', translation);
        }
      } catch (error) {
        result.steps.translation = { status: 'failed', data: null, error: error.message };
        result.summary.failed_steps++;
        result.summary.can_retry.push('translation');
        console.error('第三步失败：合同翻译', error.message);
      }

      // 构建最终结果
      const finalResult = this.buildFinalResult(result, text);
      console.log('分析流程完成，结果:', finalResult);
      
      return finalResult;

    } catch (error) {
      console.error('分析流程整体失败:', error);
      throw error;
    }
  }

  // 构建最终结果
  buildFinalResult(result, originalText) {
    const finalResult = {
      compliance_score: 0,
      risk_level: 'unknown',
      risk_factors: [],
      suggestions: [],
      matched_articles: [],
      analysis_summary: '分析未完成',
      contract_optimization: {
        optimized_text: originalText,
        modifications: [],
        summary: '优化未完成'
      },
      translation: {
        target_language: 'en',
        translated_text: originalText,
        status: 'failed'
      },
      analysis_status: result.summary,
      can_retry_steps: result.summary.can_retry
    };

    // 合并法律分析结果
    if (result.steps.legal_analysis.status === 'completed') {
      const legalData = result.steps.legal_analysis.data;
      finalResult.compliance_score = legalData.compliance_score;
      finalResult.risk_level = legalData.risk_level;
      finalResult.risk_factors = legalData.risk_factors;
      finalResult.suggestions = legalData.suggestions;
      finalResult.matched_articles = legalData.matched_articles;
      finalResult.analysis_summary = legalData.analysis_summary;
    }

    // 合并合同优化结果
    if (result.steps.optimization.status === 'completed') {
      const optData = result.steps.optimization.data;
      finalResult.contract_optimization = optData;
    }

    // 合并翻译结果
    if (result.steps.translation.status === 'completed') {
      const transData = result.steps.translation.data;
      finalResult.translation = transData;
    }

    return finalResult;
  }

  // 重试特定步骤
  async retryStep(stepName, text, legalAnalysis = null, primaryLaw = 'china', secondaryLaw = null) {
    console.log(`重试步骤: ${stepName}`);
    
    try {
      switch (stepName) {
        case 'legal_analysis':
          return await this.analyzeLegalCompliance(text, primaryLaw, secondaryLaw);
        
        case 'optimization':
          if (!legalAnalysis) {
            throw new Error('需要先完成法律分析才能进行合同优化');
          }
          return await this.optimizeContract(text, legalAnalysis, primaryLaw, secondaryLaw);
        
        case 'translation':
          if (!legalAnalysis) {
            throw new Error('需要先完成法律分析才能进行翻译');
          }
          const optimizedText = text; // 这里可能需要传入优化后的文本
          return await this.translateContract(optimizedText, 'en', primaryLaw, secondaryLaw);
        
        default:
          throw new Error(`未知的步骤: ${stepName}`);
      }
    } catch (error) {
      console.error(`重试步骤 ${stepName} 失败:`, error);
      throw error;
    }
  }

  // 构建法律分析提示词
  buildLegalAnalysisPrompt(text, primaryLaw, secondaryLaw) {
    const primaryLawName = this.getLawName(primaryLaw);
    const secondaryLawName = secondaryLaw ? this.getLawName(secondaryLaw) : null;
    
    let prompt = `分析以下合同的法律合规性，确保同时符合${primaryLawName}法律`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律`;
    }
    prompt += `。

合同内容：
${text}

要求：
1. 评估合规性（0-100分）
2. 识别风险因素
3. 提供改进建议（必须引用具体法律条文）
4. 匹配相关法条

请返回JSON格式：
{
  "compliance_score": 分数,
  "risk_level": "风险等级",
  "risk_factors": ["风险1", "风险2"],
  "suggestions": [
    {
      "suggestion": "建议内容",
      "legal_basis": "具体法律条文引用"
    }
  ],
  "matched_articles": ["法条1", "法条2"],
  "analysis_summary": "分析摘要"
}`;

    return prompt;
  }

  // 构建合同优化提示词
  buildOptimizationPrompt(text, legalAnalysis, primaryLaw, secondaryLaw) {
    const primaryLawName = this.getLawName(primaryLaw);
    const secondaryLawName = secondaryLaw ? this.getLawName(secondaryLaw) : null;
    
    let prompt = `基于法律分析结果，优化合同以确保同时符合${primaryLawName}法律`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律`;
    }
    prompt += `。

原始合同：${text}

法律分析结果：${JSON.stringify(legalAnalysis)}

要求：
1. 提供优化后的合同文本
2. 列出具体修改点（必须引用法律依据）
3. 确保修改后的合同符合两国法律

请返回JSON格式：
{
  "optimized_text": "优化后的合同文本",
  "modifications": [
    {
      "original_text": "原文",
      "modified_text": "修改后",
      "legal_basis": "法律依据（具体条文）",
      "reason": "修改原因"
    }
  ],
  "summary": "优化总结"
}`;

    return prompt;
  }

  // 构建翻译提示词
  buildTranslationPrompt(optimizedText, targetLanguage, primaryLaw, secondaryLaw) {
    const primaryLawName = this.getLawName(primaryLaw);
    const secondaryLawName = secondaryLaw ? this.getLawName(secondaryLaw) : null;
    
    let prompt = `将优化后的合同翻译成${this.getLanguageName(targetLanguage)}，确保法律术语准确。

合同内容：${optimizedText}

要求：
1. 保持法律条款的准确性
2. 确保术语符合${primaryLawName}法律体系`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律体系`;
    }
    prompt += `
3. 保留所有法律引用

请返回JSON格式：
{
  "target_language": "${targetLanguage}",
  "translated_text": "翻译后的文本",
  "translated_modifications": ["翻译的修改点"]
}`;

    return prompt;
  }

  // 解析法律分析响应
  parseLegalAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          compliance_score: Math.max(0, Math.min(100, parseInt(parsed.compliance_score) || 0)),
          risk_level: this.calculateRiskLevel(parsed.compliance_score || 0),
          risk_factors: parsed.risk_factors || [],
          suggestions: parsed.suggestions || [],
          matched_articles: parsed.matched_articles || [],
          analysis_summary: parsed.analysis_summary || "法律分析完成"
        };
      }
      throw new Error('未找到有效的JSON数据');
    } catch (error) {
      console.error('解析法律分析响应失败:', error);
      throw new Error(`法律分析响应解析失败: ${error.message}`);
    }
  }

  // 解析合同优化响应
  parseOptimizationResponse(response) {
    try {
      // 首先尝试直接解析完整响应
      let parsed = null;
      try {
        parsed = JSON.parse(response);
      } catch (directError) {
        // 如果直接解析失败，尝试提取JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw directError;
        }
      }
      
      // 验证必要字段
      if (!parsed.optimized_text && !parsed.modifications) {
        throw new Error('AI响应缺少必要字段');
      }

      return {
        optimized_text: parsed.optimized_text || '',
        modifications: parsed.modifications || [],
        summary: parsed.summary || "合同优化完成"
      };
    } catch (error) {
      console.error('解析合同优化响应失败:', error);
      console.error('原始响应:', response);
      
      // 尝试更宽松的解析
      try {
        // 查找所有可能的JSON片段
        const jsonMatches = response.match(/\{[^{}]*\}/g);
        if (jsonMatches && jsonMatches.length > 0) {
          // 尝试合并多个JSON片段
          let mergedJson = '{';
          for (const match of jsonMatches) {
            const cleanMatch = match.replace(/^\{|\}$/g, '');
            if (cleanMatch) {
              mergedJson += (mergedJson === '{' ? '' : ',') + cleanMatch;
            }
          }
          mergedJson += '}';
          
          const partialParsed = JSON.parse(mergedJson);
          
          return {
            optimized_text: partialParsed.optimized_text || '',
            modifications: partialParsed.modifications || [],
            summary: partialParsed.summary || '合同优化完成（部分结果）'
          };
        }
      } catch (partialError) {
        console.error('宽松解析也失败:', partialError);
      }
      
      throw new Error(`合同优化响应解析失败: ${error.message}`);
    }
  }

  // 解析翻译响应
  parseTranslationResponse(response) {
    try {
      // 首先尝试直接解析完整响应
      let parsed = null;
      try {
        parsed = JSON.parse(response);
      } catch (directError) {
        // 如果直接解析失败，尝试提取JSON部分
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw directError;
        }
      }
      
      // 验证必要字段
      if (!parsed.translated_text) {
        throw new Error('AI响应缺少必要字段');
      }

      return {
        target_language: parsed.target_language || 'en',
        translated_text: parsed.translated_text || '',
        translated_modifications: parsed.translated_modifications || []
      };
    } catch (error) {
      console.error('解析翻译响应失败:', error);
      console.error('原始响应:', response);
      
      // 尝试更宽松的解析
      try {
        // 查找所有可能的JSON片段
        const jsonMatches = response.match(/\{[^{}]*\}/g);
        if (jsonMatches && jsonMatches.length > 0) {
          // 尝试合并多个JSON片段
          let mergedJson = '{';
          for (const match of jsonMatches) {
            const cleanMatch = match.replace(/^\{|\}$/g, '');
            if (cleanMatch) {
              mergedJson += (mergedJson === '{' ? '' : ',') + cleanMatch;
            }
          }
          mergedJson += '}';
          
          const partialParsed = JSON.parse(mergedJson);
          
          return {
            target_language: partialParsed.target_language || 'en',
            translated_text: partialParsed.translated_text || '',
            translated_modifications: partialParsed.translated_modifications || []
          };
        }
      } catch (partialError) {
        console.error('宽松解析也失败:', partialError);
      }
      
      throw new Error(`翻译响应解析失败: ${error.message}`);
    }
  }

  // 计算风险等级
  calculateRiskLevel(complianceScore) {
    if (complianceScore >= 90) return 'low';
    if (complianceScore >= 70) return 'medium';
    if (complianceScore >= 50) return 'high';
    return 'critical';
  }

  // 获取法律体系显示名称
  getLawDisplayName(lawCode) {
    const lawNames = {
      'china': '中华人民共和国法律',
      'usa': '美国法律',
      'eu': '欧盟法律',
      'japan': '日本法律',
      'germany': '德国法律',
      'france': '法国法律',
      'uk': '英国法律',
      'canada': '加拿大法律',
      'australia': '澳大利亚法律',
      'singapore': '新加坡法律'
    };
    return lawNames[lawCode] || lawCode;
  }

  // 获取法律体系名称（用于提示词）
  getLawName(lawCode) {
    const lawNames = {
      'china': '中华人民共和国法律',
      'usa': '美国法律',
      'eu': '欧盟法律',
      'japan': '日本法律',
      'germany': '德国法律',
      'france': '法国法律',
      'uk': '英国法律',
      'canada': '加拿大法律',
      'australia': '澳大利亚法律',
      'singapore': '新加坡法律'
    };
    return lawNames[lawCode] || lawCode;
  }

  // 获取语言显示名称
  getLanguageName(langCode) {
    const languageNames = {
      'en': '英语',
      'ja': '日语',
      'de': '德语',
      'fr': '法语',
      'es': '西班牙语',
      'ru': '俄语',
      'ko': '韩语',
      'zh': '中文'
    };
    return languageNames[langCode] || langCode;
  }

  // 构建包含上下文的优化提示词
  buildOptimizationPromptWithContext(text, legalAnalysis, primaryLaw, secondaryLaw) {
    const primaryLawName = this.getLawName(primaryLaw);
    const secondaryLawName = secondaryLaw ? this.getLawName(secondaryLaw) : null;
    
    let prompt = `基于以下法律分析结果，请优化合同以确保同时符合${primaryLawName}法律`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律`;
    }
    prompt += `。

原始合同：${text}

法律分析结果：
- 合规评分：${legalAnalysis.compliance_score}
- 风险等级：${legalAnalysis.risk_level}
- 风险因素：${legalAnalysis.risk_factors.join('、')}
- 改进建议：${legalAnalysis.suggestions.map(s => s.suggestion).join('；')}

要求：
1. 基于上述法律分析结果，提供优化后的合同文本
2. 列出具体修改点，每个修改必须引用具体的法律依据
3. 确保修改后的合同符合两国法律要求
4. 为每个修改添加高亮信息，便于前端展示

请返回JSON格式：
{
  "optimized_text": "优化后的合同文本",
  "modifications": [
    {
      "original_text": "原文",
      "modified_text": "修改后",
      "legal_basis": "法律依据（具体条文）",
      "reason": "修改原因",
      "highlight_start": 0,
      "highlight_end": 100,
      "highlight_type": "modify"
    }
  ],
  "summary": "优化总结"
}`;

    return prompt;
  }

  // 构建包含上下文的翻译提示词
  buildTranslationPromptWithContext(optimizedText, targetLanguage, legalAnalysis, primaryLaw, secondaryLaw) {
    const primaryLawName = this.getLawName(primaryLaw);
    const secondaryLawName = secondaryLaw ? this.getLawName(secondaryLaw) : null;
    
    let prompt = `请将以下优化后的合同翻译成${this.getLanguageName(targetLanguage)}，确保法律术语准确。

合同内容：${optimizedText}

法律背景：
- 主要法律体系：${primaryLawName}`;
    if (secondaryLawName) {
      prompt += `
- 次要法律体系：${secondaryLawName}`;
    }
    prompt += `
- 涉及的主要法条：${legalAnalysis.matched_articles.join('、')}

要求：
1. 保持法律条款的准确性和专业性
2. 确保术语符合两国法律体系
3. 保留所有法律引用和条款编号
4. 翻译后的修改建议也要完整准确

请返回JSON格式：
{
  "target_language": "${targetLanguage}",
  "translated_text": "翻译后的文本",
  "translated_modifications": [
    {
      "original_text": "原文",
      "translated_text": "翻译后",
      "legal_basis": "法律依据（具体条文）",
      "reason": "修改原因"
    }
  ]
}`;

    return prompt;
  }

  // 基于上下文的合同优化
  async optimizeContractWithContext(text, prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的合同优化专家，专门根据法律分析结果优化合同条款。请严格按照JSON格式返回优化结果。"
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
      console.log('合同优化AI响应:', aiResponse);
      return this.parseOptimizationResponse(aiResponse);
    } catch (error) {
      console.error('合同优化失败:', error);
      return {
        optimized_text: text,
        modifications: [],
        summary: "合同优化失败，使用原文",
        status: 'failed',
        error: error.message
      };
    }
  }

  // 基于上下文的合同翻译
  async translateContractWithContext(prompt) {
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-opus-4.1",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律翻译专家，专门翻译法律合同。请严格按照JSON格式返回翻译结果。"
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
      console.log('合同翻译AI响应:', aiResponse);
      return this.parseTranslationResponse(aiResponse);
    } catch (error) {
      console.error('合同翻译失败:', error);
      return {
        target_language: 'en',
        translated_text: '',
        translated_modifications: [],
        status: 'failed',
        error: error.message
      };
    }
  }
}

module.exports = AIService; 