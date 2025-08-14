const axios = require('axios');
require('dotenv').config({ path: './config.env' });

class APIKeyTester {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.baseURL = 'https://openrouter.ai/api/v1';
    this.testResults = [];
  }

  // 测试API key是否已设置
  testAPIKeyExists() {
    console.log('\n=== 测试1: API Key 配置检查 ===');
    
    if (!this.apiKey) {
      this.testResults.push({
        test: 'API Key 配置检查',
        status: 'FAILED',
        message: 'API Key 未设置',
        details: '请在 config.env 文件中设置 OPENROUTER_API_KEY'
      });
      console.log('❌ API Key 未设置');
      return false;
    }

    if (this.apiKey.startsWith('sk-or-v1-')) {
      this.testResults.push({
        test: 'API Key 配置检查',
        status: 'PASSED',
        message: 'API Key 已设置且格式正确',
        details: `API Key: ${this.apiKey.substring(0, 20)}...`
      });
      console.log('✅ API Key 已设置且格式正确');
      console.log(`   API Key: ${this.apiKey.substring(0, 20)}...`);
      return true;
    } else {
      this.testResults.push({
        test: 'API Key 配置检查',
        status: 'FAILED',
        message: 'API Key 格式不正确',
        details: 'OpenRouter API Key 应该以 sk-or-v1- 开头'
      });
      console.log('❌ API Key 格式不正确');
      return false;
    }
  }

  // 测试API连接性
  async testAPIConnectivity() {
    console.log('\n=== 测试2: API 连接性测试 ===');
    
    try {
      const response = await axios.get('https://openrouter.ai/api/v1/models', {
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        this.testResults.push({
          test: 'API 连接性测试',
          status: 'PASSED',
          message: 'API 连接成功',
          details: `状态码: ${response.status}, 响应时间: ${response.headers['x-response-time'] || 'N/A'}ms`
        });
        console.log('✅ API 连接成功');
        console.log(`   状态码: ${response.status}`);
        return true;
      } else {
        this.testResults.push({
          test: 'API 连接性测试',
          status: 'FAILED',
          message: 'API 连接失败',
          details: `状态码: ${response.status}`
        });
        console.log(`❌ API 连接失败，状态码: ${response.status}`);
        return false;
      }
    } catch (error) {
      let errorMessage = '未知错误';
      let errorDetails = '';

      if (error.code === 'ECONNREFUSED') {
        errorMessage = '连接被拒绝';
        errorDetails = '无法连接到 OpenRouter API 服务器';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = '域名解析失败';
        errorDetails = '无法解析 openrouter.ai 域名';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '连接超时';
        errorDetails = 'API 请求超时';
      } else if (error.response) {
        errorMessage = `HTTP 错误 ${error.response.status}`;
        errorDetails = error.response.data?.error?.message || error.response.statusText;
      } else if (error.request) {
        errorMessage = '网络请求失败';
        errorDetails = '没有收到服务器响应';
      }

      this.testResults.push({
        test: 'API 连接性测试',
        status: 'FAILED',
        message: errorMessage,
        details: errorDetails
      });

      console.log(`❌ API 连接失败: ${errorMessage}`);
      console.log(`   详细信息: ${errorDetails}`);
      return false;
    }
  }

  // 测试API key有效性
  async testAPIKeyValidity() {
    console.log('\n=== 测试3: API Key 有效性测试 ===');
    
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-3-haiku-20240307",
          messages: [
            {
              role: "user",
              content: "请回复'Hello World'来测试API连接。"
            }
          ],
          max_tokens: 10,
          temperature: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'API Key Test'
          },
          timeout: 30000
        }
      );

      if (response.status === 200 && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        this.testResults.push({
          test: 'API Key 有效性测试',
          status: 'PASSED',
          message: 'API Key 有效，AI 响应成功',
          details: `AI 响应: "${aiResponse}", 模型: ${response.data.model}`
        });
        console.log('✅ API Key 有效，AI 响应成功');
        console.log(`   AI 响应: "${aiResponse}"`);
        console.log(`   使用模型: ${response.data.model}`);
        return true;
      } else {
        this.testResults.push({
          test: 'API Key 有效性测试',
          status: 'FAILED',
          message: 'API 响应格式异常',
          details: `响应状态: ${response.status}, 响应数据: ${JSON.stringify(response.data)}`
        });
        console.log('❌ API 响应格式异常');
        return false;
      }
    } catch (error) {
      let errorMessage = '未知错误';
      let errorDetails = '';

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          errorMessage = 'API Key 无效或已过期';
          errorDetails = '请检查 API Key 是否正确，或者是否已过期';
        } else if (status === 403) {
          errorMessage = 'API Key 权限不足';
          errorDetails = '当前 API Key 没有访问该模型的权限';
        } else if (status === 429) {
          errorMessage = 'API 请求频率超限';
          errorDetails = '请求过于频繁，请稍后再试';
        } else if (status === 500) {
          errorMessage = 'OpenRouter 服务器内部错误';
          errorDetails = '服务器暂时不可用，请稍后再试';
        } else {
          errorMessage = `HTTP 错误 ${status}`;
          errorDetails = data?.error?.message || error.response.statusText;
        }
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = '请求超时';
        errorDetails = 'AI 响应时间过长，可能是网络问题或服务器负载过高';
      } else if (error.code === 'ECONNRESET') {
        errorMessage = '连接重置';
        errorDetails = '网络连接被重置，请检查网络稳定性';
      }

      this.testResults.push({
        test: 'API Key 有效性测试',
        status: 'FAILED',
        message: errorMessage,
        details: errorDetails
      });

      console.log(`❌ API Key 有效性测试失败: ${errorMessage}`);
      console.log(`   详细信息: ${errorDetails}`);
      return false;
    }
  }

  // 测试模型可用性
  async testModelAvailability() {
    console.log('\n=== 测试4: 模型可用性测试 ===');
    
    try {
      const response = await axios.get(`${this.baseURL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      if (response.status === 200 && response.data.data) {
        const models = response.data.data;
        const targetModel = models.find(m => m.id === 'anthropic/claude-opus-4.1');
        
        if (targetModel) {
          this.testResults.push({
            test: '模型可用性测试',
            status: 'PASSED',
            message: '目标模型可用',
            details: `模型: ${targetModel.id}, 状态: ${targetModel.object || 'available'}`
          });
          console.log('✅ 目标模型可用');
          console.log(`   模型: ${targetModel.id}`);
          console.log(`   状态: ${targetModel.object || 'available'}`);
          
          // 显示可用的模型数量
          console.log(`   总共可用模型: ${models.length} 个`);
          return true;
        } else {
          this.testResults.push({
            test: '模型可用性测试',
            status: 'WARNING',
            message: '目标模型不可用，但有其他模型可用',
            details: `可用模型数量: ${models.length}, 目标模型: anthropic/claude-opus-4.1 未找到`
          });
          console.log('⚠️  目标模型不可用，但有其他模型可用');
          console.log(`   可用模型数量: ${models.length}`);
          console.log(`   目标模型: anthropic/claude-opus-4.1 未找到`);
          
          // 显示前几个可用模型
          const availableModels = models.slice(0, 5).map(m => m.id);
          console.log(`   部分可用模型: ${availableModels.join(', ')}`);
          return false;
        }
      } else {
        this.testResults.push({
          test: '模型可用性测试',
          status: 'FAILED',
          message: '无法获取模型列表',
          details: `响应状态: ${response.status}`
        });
        console.log('❌ 无法获取模型列表');
        return false;
      }
    } catch (error) {
      let errorMessage = '获取模型列表失败';
      let errorDetails = '';

      if (error.response) {
        errorDetails = `HTTP ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`;
      } else if (error.code === 'ETIMEDOUT') {
        errorDetails = '请求超时';
      } else {
        errorDetails = error.message;
      }

      this.testResults.push({
        test: '模型可用性测试',
        status: 'FAILED',
        message: errorMessage,
        details: errorDetails
      });

      console.log(`❌ ${errorMessage}: ${errorDetails}`);
      return false;
    }
  }

  // 测试实际业务场景
  async testBusinessScenario() {
    console.log('\n=== 测试5: 业务场景测试 ===');
    
    try {
      const testContract = `
甲方：测试公司
乙方：测试供应商
合同内容：双方约定乙方提供技术服务，甲方支付相应费用。
违约责任：如任何一方违反本协议，应承担相应法律责任。
      `;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "anthropic/claude-3-haiku-20240307",
          messages: [
            {
              role: "system",
              content: "你是一个专业的法律合规分析师，专门分析合同的法律合规性。请简要分析以下合同。"
            },
            {
              role: "user",
              content: `请分析以下合同的法律合规性：\n\n${testContract}`
            }
          ],
          max_tokens: 200,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3001',
            'X-Title': 'Business Scenario Test'
          },
          timeout: 30000
        }
      );

      if (response.status === 200 && response.data.choices && response.data.choices[0]) {
        const aiResponse = response.data.choices[0].message.content;
        this.testResults.push({
          test: '业务场景测试',
          status: 'PASSED',
          message: '业务场景测试成功',
          details: `AI 分析响应: ${aiResponse.substring(0, 100)}...`
        });
        console.log('✅ 业务场景测试成功');
        console.log(`   AI 分析响应: ${aiResponse.substring(0, 100)}...`);
        return true;
      } else {
        this.testResults.push({
          test: '业务场景测试',
          status: 'FAILED',
          message: '业务场景测试失败',
          details: 'AI 响应格式异常'
        });
        console.log('❌ 业务场景测试失败');
        return false;
      }
    } catch (error) {
      let errorMessage = '业务场景测试失败';
      let errorDetails = '';

      if (error.response) {
        errorDetails = `HTTP ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`;
      } else if (error.code === 'ETIMEDOUT') {
        errorDetails = '请求超时';
      } else {
        errorDetails = error.message;
      }

      this.testResults.push({
        test: '业务场景测试',
        status: 'FAILED',
        message: errorMessage,
        details: errorDetails
      });

      console.log(`❌ ${errorMessage}: ${errorDetails}`);
      return false;
    }
  }

  // 生成测试报告
  generateTestReport() {
    console.log('\n' + '='.repeat(60));
    console.log('                    API Key 测试报告');
    console.log('='.repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const warningTests = this.testResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`\n📊 测试统计:`);
    console.log(`   总测试数: ${totalTests}`);
    console.log(`   通过: ${passedTests} ✅`);
    console.log(`   失败: ${failedTests} ❌`);
    console.log(`   警告: ${warningTests} ⚠️`);
    
    console.log(`\n📋 详细测试结果:`);
    this.testResults.forEach((result, index) => {
      const statusIcon = result.status === 'PASSED' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`\n${index + 1}. ${statusIcon} ${result.test}`);
      console.log(`   状态: ${result.status}`);
      console.log(`   消息: ${result.message}`);
      console.log(`   详情: ${result.details}`);
    });
    
    // 总体评估
    console.log(`\n🎯 总体评估:`);
    if (failedTests === 0 && warningTests === 0) {
      console.log('   🎉 所有测试通过！API Key 完全可用。');
    } else if (failedTests === 0) {
      console.log('   ⚠️  大部分测试通过，但有一些警告需要注意。');
    } else if (failedTests <= 2) {
      console.log('   ⚠️  部分测试失败，API Key 可能存在问题。');
    } else {
      console.log('   ❌ 多个测试失败，API Key 不可用或配置有误。');
    }
    
    // 建议
    console.log(`\n💡 建议:`);
    if (failedTests > 0) {
      console.log('   1. 检查 API Key 是否正确设置');
      console.log('   2. 确认 API Key 是否有效且未过期');
      console.log('   3. 检查网络连接是否正常');
      console.log('   4. 确认 OpenRouter 服务是否可用');
    } else {
      console.log('   1. API Key 配置正确，可以正常使用');
      console.log('   2. 建议定期测试 API 可用性');
      console.log('   3. 监控 API 使用量和费用');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  // 运行所有测试
  async runAllTests() {
    console.log('🚀 开始 API Key 测试...\n');
    
    // 测试1: API Key 配置检查
    const keyExists = this.testAPIKeyExists();
    
    if (!keyExists) {
      console.log('\n❌ API Key 未正确配置，跳过后续测试');
      this.generateTestReport();
      return;
    }
    
    // 测试2: API 连接性测试
    await this.testAPIConnectivity();
    
    // 测试3: API Key 有效性测试
    await this.testAPIKeyValidity();
    
    // 测试4: 模型可用性测试
    await this.testModelAvailability();
    
    // 测试5: 业务场景测试
    await this.testBusinessScenario();
    
    // 生成测试报告
    this.generateTestReport();
  }
}

// 主函数
async function main() {
  try {
    const tester = new APIKeyTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('\n❌ 测试过程中发生未预期的错误:', error.message);
    console.error('请检查网络连接和配置是否正确');
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  main();
}

module.exports = APIKeyTester; 