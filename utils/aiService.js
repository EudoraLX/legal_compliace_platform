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

      // 检查响应数据结构
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('AI响应数据结构异常');
      }
      
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

      // 检查响应数据结构
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('AI响应数据结构异常');
      }
      
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
      content: originalText, // 添加原始合同内容
      contract_text: originalText, // 添加原始合同内容（兼容性）
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
      
      // 确保分数是有效的数字
      let score = 0;
      if (legalData.compliance_score !== undefined && legalData.compliance_score !== null) {
        if (typeof legalData.compliance_score === 'string') {
          score = parseFloat(legalData.compliance_score) || 0;
        } else if (typeof legalData.compliance_score === 'number') {
          score = legalData.compliance_score;
        }
      }
      
      // 如果分数仍然为0，尝试从其他字段计算
      if (score === 0 && legalData.matched_articles && legalData.matched_articles.length > 0) {
        // 基于匹配的法条数量计算基础分数
        const totalArticles = legalData.matched_articles.length;
        const compliantArticles = legalData.matched_articles.filter(article => 
          article.compliance === true || article.compliance === 'true'
        ).length;
        
        if (totalArticles > 0) {
          score = Math.round((compliantArticles / totalArticles) * 100);
        }
      }
      
      finalResult.compliance_score = Math.max(0, Math.min(100, score));
      finalResult.risk_level = legalData.risk_level || this.calculateRiskLevel(score);
      finalResult.risk_factors = legalData.risk_factors || [];
      finalResult.suggestions = legalData.suggestions || [];
      finalResult.matched_articles = legalData.matched_articles || [];
      finalResult.analysis_summary = legalData.analysis_summary || "法律分析完成";
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
    
    let prompt = `请分析以下国际合同的法律合规性，确保同时符合${primaryLawName}法律`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律`;
    }
    prompt += `。

合同内容：
${text}

分析要求：
1. 评估合同合规性（0-100分）
2. 识别风险因素
3. 提供改进建议（必须引用具体法律条文）
4. 匹配相关法条并提供详细分析

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
  "matched_articles": [
    {
      "article": "法条名称和编号",
      "description": "法条内容描述",
      "compliance": true/false,
      "original_text": "法条原文",
      "contract_reference": "与合同的具体关联",
      "analysis": "详细分析说明"
    }
  ],
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
2. 列出具体修改点（必须引用具体法律条文作为依据）
3. 确保修改后的合同符合两国法律
4. 为每个修改点提供精确的原文匹配信息，用于前端高亮显示
5. 每个修改建议必须包含：
   - 具体的法律条文引用（包括法条名称、编号和内容）
   - 修改的法律依据和必要性
   - 修改后的法律效果

请返回JSON格式：
{
  "optimized_text": "优化后的合同文本",
  "modifications": [
    {
      "original_text": "原文内容（必须与合同中的原文完全匹配）",
      "modified_text": "修改后的内容",
      "legal_basis": "法律依据（具体条文）",
      "reason": "修改原因",
      "highlight_type": "modify|add|delete",
      "position": "修改位置描述"
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
1. 保持法律条款的准确性和专业性
2. 确保术语符合${primaryLawName}法律体系`;
    if (secondaryLawName) {
      prompt += `和${secondaryLawName}法律体系`;
    }
    prompt += `
3. 保留所有法律引用和法条编号
4. 翻译修改建议和法律依据
5. 使用目标语言中对应的法律术语
6. 确保翻译后的合同在两个法律体系下都具有法律效力

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
  ],
  "translated_legal_basis": "翻译后的法律依据总结"
}`;

    return prompt;
  }

  // 解析法律分析响应
  parseLegalAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        console.log('AI服务解析的法律分析结果:', parsed);
        console.log('matched_articles:', parsed.matched_articles);
        
        // 确保分数是有效的数字
        let score = 0;
        if (parsed.compliance_score !== undefined && parsed.compliance_score !== null) {
          if (typeof parsed.compliance_score === 'string') {
            score = parseFloat(parsed.compliance_score) || 0;
          } else if (typeof parsed.compliance_score === 'number') {
            score = parsed.compliance_score;
          }
        }
        
        // 如果分数仍然为0，尝试从其他字段计算
        if (score === 0 && parsed.matched_articles && parsed.matched_articles.length > 0) {
          // 基于匹配的法条数量计算基础分数
          const totalArticles = parsed.matched_articles.length;
          const compliantArticles = parsed.matched_articles.filter(article => 
            article.compliance === true || article.compliance === 'true'
          ).length;
          
          if (totalArticles > 0) {
            score = Math.round((compliantArticles / totalArticles) * 100);
          }
        }
        
        return {
          compliance_score: Math.max(0, Math.min(100, score)),
          risk_level: this.calculateRiskLevel(score),
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

      // 检查响应数据结构
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('AI响应数据结构异常');
      }
      
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

  // 构建翻译提示
  buildTranslationPromptWithContext(text, targetLanguage, context, primaryLaw, secondaryLaw) {
    const prompt = `请将以下法律合同从中文翻译成${targetLanguage === 'en' ? '英文' : targetLanguage}。

合同内容：
${text}

法律体系背景：
- 主要法律体系：${this.getLawDisplayName(primaryLaw)}
- 次要法律体系：${this.getLawDisplayName(secondaryLaw)}

翻译要求：
1. 保持法律术语的准确性和专业性
2. 确保合同条款的完整性和一致性
3. 使用目标语言的标准法律表达方式
4. 保持原文的格式和结构

请返回JSON格式的翻译结果：
{
  "translated_text": "翻译后的完整合同文本",
  "target_language": "${targetLanguage}",
  "status": "success"
}`;

    return prompt;
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

      // 检查响应数据结构
      if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
        throw new Error('AI响应数据结构异常');
      }
      
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

  // 获取法律体系显示名称
  getLawDisplayName(lawCode) {
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

  // 解析翻译响应
  parseTranslationResponse(aiResponse) {
    try {
      // 清理AI响应，移除可能的反引号和多余字符
      let cleanedResponse = aiResponse.trim();
      
      // 如果响应以反引号开始和结束，移除它们
      if (cleanedResponse.startsWith('`') && cleanedResponse.endsWith('`')) {
        cleanedResponse = cleanedResponse.slice(1, -1);
      }
      
      // 如果响应以```json开始，找到对应的结束位置
      if (cleanedResponse.startsWith('```json')) {
        const endIndex = cleanedResponse.lastIndexOf('```');
        if (endIndex > 7) {
          cleanedResponse = cleanedResponse.substring(7, endIndex);
        }
      }
      
      // 尝试解析JSON响应
      const parsed = JSON.parse(cleanedResponse);
      
      if (parsed.translated_text) {
        return {
          target_language: parsed.target_language || 'en',
          translated_text: parsed.translated_text,
          status: 'success'
        };
      } else {
        throw new Error('AI响应中缺少翻译文本');
      }
    } catch (parseError) {
      console.error('解析翻译响应失败:', parseError);
      console.log('原始AI响应:', aiResponse);
      
      // 如果JSON解析失败，尝试多种方式提取翻译文本
      let translatedText = '';
      
      // 方法1：尝试提取translated_text字段
      const textMatch1 = aiResponse.match(/translated_text["\s]*:["\s]*"([^"]+)"/);
      if (textMatch1) {
        translatedText = textMatch1[1];
      }
      
      // 方法2：尝试提取被反引号包围的内容
      const textMatch2 = aiResponse.match(/`([^`]+)`/);
      if (textMatch2 && !translatedText) {
        translatedText = textMatch2[1];
      }
      
      // 方法3：尝试提取JSON对象中的文本内容
      const textMatch3 = aiResponse.match(/"([^"]{10,})"/);
      if (textMatch3 && !translatedText) {
        translatedText = textMatch3[1];
      }
      
      if (translatedText) {
        return {
          target_language: 'en',
          translated_text: translatedText,
          status: 'success'
        };
      }
      
      // 如果都失败了，返回错误
      return {
        target_language: 'en',
        translated_text: '',
        status: 'failed',
        error: '无法解析AI翻译响应'
      };
    }
  }
}

module.exports = AIService; 