// 全局变量
let selectedFile = null;
let currentAnalysis = null;
let originalContractText = '';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeFileInput();
    loadHistory();
    loadStatistics();
});

// 初始化文件输入
function initializeFileInput() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0]);
    });
    
    // 拖拽事件
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
}

// 处理文件选择
function handleFileSelect(file) {
    if (!file) return;
    
    // 检查文件类型
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        alert('不支持的文件格式！请上传 PDF、Word 或 TXT 文件。');
        return;
    }
    
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过 10MB！');
        return;
    }
    
    selectedFile = file;
    
    // 显示文件信息
    document.getElementById('fileName').textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    document.getElementById('fileInfo').style.display = 'block';
}

// 清除文件选择
function clearFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
}

// 分析合同
async function analyzeContract() {
    if (!selectedFile) {
        alert('请先选择文件！');
        return;
    }
    
    // 显示进度区域
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    
    try {
        // 创建 FormData
        const formData = new FormData();
        formData.append('contract', selectedFile);
        
        // 发送请求
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        currentAnalysis = result;
        
        // 显示结果
        displayResults(result);
        
    } catch (error) {
        console.error('分析失败:', error);
        alert('分析失败: ' + error.message);
        
        // 返回上传区域
        document.getElementById('uploadSection').style.display = 'block';
        document.getElementById('progressSection').style.display = 'none';
    }
}

// 显示分析结果
function displayResults(result) {
    const analysis = result.analysis;
    
    // 更新合规分数
    document.getElementById('complianceScore').textContent = analysis.compliance_score;
    
    // 更新分数描述
    let scoreDescription = '';
    if (analysis.compliance_score >= 90) {
        scoreDescription = '优秀 - 合同基本符合对外贸易法要求';
    } else if (analysis.compliance_score >= 70) {
        scoreDescription = '良好 - 建议完善部分条款';
    } else if (analysis.compliance_score >= 50) {
        scoreDescription = '一般 - 需要重点关注风险因素';
    } else {
        scoreDescription = '较差 - 建议咨询专业律师';
    }
    document.getElementById('scoreDescription').textContent = scoreDescription;
    
    // 显示分析摘要
    if (analysis.analysis_summary) {
        document.getElementById('analysisSummary').textContent = analysis.analysis_summary;
    }
    
    // 显示相关条例
    displayRegulations(analysis.matched_articles);
    
    // 显示法条原文对照
    displayRegulationsComparison(analysis.matched_articles);
    
    // 显示风险因素
    displayRiskFactors(analysis.risk_factors);
    
    // 显示改进建议
    displaySuggestions(analysis.suggestions);
    
    // 显示合同内容
    displayContractText(result.contract_text || '');
    
    // 显示结果区域
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    
    // 刷新历史记录和统计
    loadHistory();
    loadStatistics();
}

// 显示相关条例
function displayRegulations(regulations) {
    const regulationsList = document.getElementById('regulationsList');
    
    if (!regulations || regulations.length === 0) {
        regulationsList.innerHTML = '<p class="text-muted">未发现相关条例</p>';
        return;
    }
    
    const regulationsHtml = regulations.map(regulation => `
        <div class="regulation-item ${regulation.compliance ? 'compliant' : 'non-compliant'}">
            <h6><i class="fas fa-gavel"></i> ${regulation.article}</h6>
            <p class="mb-2">${regulation.description}</p>
            <small class="text-muted">
                <i class="fas fa-${regulation.compliance ? 'check-circle text-success' : 'exclamation-circle text-danger'}"></i>
                ${regulation.compliance ? '符合要求' : '需要关注'}
            </small>
        </div>
    `).join('');
    
    regulationsList.innerHTML = regulationsHtml;
}

// 显示法条原文对照
function displayRegulationsComparison(regulations) {
    const regulationsComparison = document.getElementById('regulationsComparison');
    
    if (!regulations || regulations.length === 0) {
        regulationsComparison.innerHTML = '<p class="text-muted">无法条对照信息</p>';
        return;
    }
    
    const comparisonHtml = regulations.map(regulation => `
        <div class="regulation-comparison">
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0"><i class="fas fa-balance-scale"></i> ${regulation.article}</h6>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-primary"><i class="fas fa-gavel"></i> 法条原文：</h6>
                            <div class="bg-light p-3 rounded">
                                <p class="mb-0" style="font-size: 14px; line-height: 1.6;">${regulation.original_text || '暂无原文'}</p>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-success"><i class="fas fa-file-contract"></i> 合同相关内容：</h6>
                            <div class="bg-light p-3 rounded">
                                <p class="mb-0" style="font-size: 14px; line-height: 1.6;">${regulation.contract_reference || '暂无相关内容'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <h6 class="text-info"><i class="fas fa-search"></i> 分析说明：</h6>
                        <p class="mb-0" style="font-size: 14px; line-height: 1.6;">${regulation.analysis || '暂无分析'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    regulationsComparison.innerHTML = comparisonHtml;
}

// 显示风险因素
function displayRiskFactors(riskFactors) {
    const riskFactorsList = document.getElementById('riskFactorsList');
    
    if (!riskFactors || riskFactors.length === 0) {
        riskFactorsList.innerHTML = '<p class="text-success">未发现明显风险因素</p>';
        return;
    }
    
    const riskFactorsHtml = riskFactors.map(risk => `
        <div class="alert alert-${getRiskAlertType(risk.severity)} mb-2">
            <strong>${risk.type}:</strong> ${risk.description}
            <br><small class="text-muted">建议: ${risk.suggestion}</small>
        </div>
    `).join('');
    
    riskFactorsList.innerHTML = riskFactorsHtml;
}

// 显示改进建议
function displaySuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (!suggestions || suggestions.length === 0) {
        suggestionsList.innerHTML = '<p class="text-muted">暂无具体建议</p>';
        return;
    }
    
    const suggestionsHtml = suggestions.map(suggestion => `
        <div class="alert alert-info mb-2">
            <i class="fas fa-lightbulb"></i> ${suggestion}
        </div>
    `).join('');
    
    suggestionsList.innerHTML = suggestionsHtml;
}

// 显示合同内容
function displayContractText(contractText) {
    originalContractText = contractText;
    document.getElementById('contractText').value = contractText;
}

// 获取风险等级对应的警告类型
function getRiskAlertType(severity) {
    switch (severity) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'info';
        default: return 'warning';
    }
}

// 应用AI修改建议
async function applyModifications() {
    if (!currentAnalysis) {
        alert('请先进行合同分析！');
        return;
    }
    
    try {
        const currentText = document.getElementById('contractText').value;
        
        // 显示加载状态
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI正在生成修改建议...';
        button.disabled = true;
        
        const response = await fetch('/api/modify-contract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                original_text: originalContractText,
                current_text: currentText,
                analysis: currentAnalysis.analysis
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 更新合同内容
        document.getElementById('contractText').value = result.modified_text;
        
        // 显示修改详情
        if (result.modifications && result.modifications.length > 0) {
            showModificationDetails(result.modifications);
        }
        
        alert('AI修改建议已应用！');
        
    } catch (error) {
        console.error('应用修改失败:', error);
        alert('应用修改失败: ' + error.message);
    } finally {
        // 恢复按钮状态
        const button = event.target;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 显示修改详情
function showModificationDetails(modifications) {
    const detailsHtml = modifications.map((mod, index) => `
        <div class="alert alert-info">
            <h6>修改 ${index + 1}: ${mod.type === 'add' ? '新增' : mod.type === 'modify' ? '修改' : '删除'}</h6>
            <p><strong>位置:</strong> ${mod.position}</p>
            ${mod.original_text ? `<p><strong>原文:</strong> ${mod.original_text}</p>` : ''}
            ${mod.suggested_text ? `<p><strong>建议:</strong> ${mod.suggested_text}</p>` : ''}
            <p><strong>原因:</strong> ${mod.reason}</p>
            <p><strong>相关法条:</strong> ${mod.related_article}</p>
        </div>
    `).join('');
    
    // 创建模态框显示修改详情
    const modalHtml = `
        <div class="modal fade" id="modificationModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">AI修改详情</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${detailsHtml}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 移除旧的模态框
    const oldModal = document.getElementById('modificationModal');
    if (oldModal) {
        oldModal.remove();
    }
    
    // 添加新的模态框
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('modificationModal'));
    modal.show();
}

// 下载修改后的合同
function downloadModifiedContract() {
    const modifiedText = document.getElementById('contractText').value;
    
    if (!modifiedText.trim()) {
        alert('没有可下载的合同内容！');
        return;
    }
    
    const blob = new Blob([modifiedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `修改后合同_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 重新分析
function resetAnalysis() {
    clearFile();
    currentAnalysis = null;
    originalContractText = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
}

// 切换统计面板
function toggleStats() {
    const statsPanel = document.getElementById('floatingStats');
    if (statsPanel.style.display === 'none') {
        statsPanel.style.display = 'block';
        updateFloatingStats();
    } else {
        statsPanel.style.display = 'none';
    }
}

// 更新浮动统计
function updateFloatingStats() {
    const statsContent = document.getElementById('statsContent');
    
    // 这里可以添加实时统计数据的显示
    statsContent.innerHTML = `
        <div class="stat-item">
            <span>今日分析:</span>
            <span class="badge bg-primary">5</span>
        </div>
        <div class="stat-item">
            <span>平均分数:</span>
            <span class="badge bg-success">78</span>
        </div>
        <div class="stat-item">
            <span>合规率:</span>
            <span class="badge bg-info">85%</span>
        </div>
    `;
}

// 加载历史记录
async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        const historyList = document.getElementById('historyList');
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="text-muted">暂无分析历史</p>';
            return;
        }
        
        const historyHtml = history.slice(0, 5).map(item => `
            <div class="history-item" onclick="viewHistoryDetail('${item.id}')">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${item.original_name}</h6>
                        <small class="text-muted">分析时间: ${new Date(item.created_at).toLocaleString()}</small>
                    </div>
                    <div class="text-end">
                        <div class="badge bg-${getScoreBadgeColor(item.risk_score)} fs-6">
                            ${item.risk_score}分
                        </div>
                        <br>
                        <button class="btn btn-sm btn-outline-danger mt-1" onclick="deleteHistory('${item.id}', event)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
        
        historyList.innerHTML = historyHtml;
    } catch (error) {
        console.error('加载历史记录失败:', error);
    }
}

// 查看历史详情
async function viewHistoryDetail(id) {
    try {
        const response = await fetch(`/api/analysis/${id}`);
        const contract = await response.json();
        
        // 显示分析结果
        displayResults({
            id: contract.id,
            filename: contract.original_name,
            analysis: contract.analysis_result,
            contract_text: contract.contract_text
        });
        
        // 滚动到结果区域
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('获取历史详情失败:', error);
        alert('获取历史详情失败');
    }
}

// 删除历史记录
async function deleteHistory(id, event) {
    event.stopPropagation();
    
    if (!confirm('确定要删除这条分析记录吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/analysis/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadHistory();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除历史记录失败:', error);
        alert('删除失败');
    }
}

// 加载统计数据
async function loadStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const stats = await response.json();
        
        if (!stats) {
            return;
        }
        
        // 更新浮动统计
        updateFloatingStats();
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 获取分数徽章颜色
function getScoreBadgeColor(score) {
    if (score >= 90) return 'success';
    if (score >= 70) return 'primary';
    if (score >= 50) return 'warning';
    return 'danger';
}

// 导出报告
function exportReport() {
    if (!currentAnalysis) {
        alert('请先进行合同分析！');
        return;
    }
    
    const score = document.getElementById('complianceScore').textContent;
    const description = document.getElementById('scoreDescription').textContent;
    const summary = document.getElementById('analysisSummary').textContent;
    const regulations = document.getElementById('regulationsList').innerText;
    const riskFactors = document.getElementById('riskFactorsList').innerText;
    const suggestions = document.getElementById('suggestionsList').innerText;
    
    const report = `
法律合同合规AI分析报告

文件名: ${selectedFile ? selectedFile.name : '未知'}
分析时间: ${new Date().toLocaleString()}
合规评分: ${score}
评分说明: ${description}
分析摘要: ${summary}

=== 涉及相关条例 ===
${regulations}

=== 风险因素 ===
${riskFactors}

=== 改进建议 ===
${suggestions}

---
报告生成时间: ${new Date().toLocaleString()}
AI分析平台: 法律合同合规AI分析系统
    `;
    
    // 创建下载链接
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `合同合规分析报告_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
} 