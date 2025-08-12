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
    
    // 显示文件信息，修复文件大小显示
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const fileSizeKB = (file.size / 1024).toFixed(2);
    
    let sizeText;
    if (file.size >= 1024 * 1024) {
        sizeText = `${fileSizeMB} MB`;
    } else {
        sizeText = `${fileSizeKB} KB`;
    }
    
    document.getElementById('fileName').textContent = `${file.name} (${sizeText})`;
    document.getElementById('fileInfo').style.display = 'block';
    
    // 显示成功提示
    showMessage('文件选择成功！', 'success');
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
    
    // 自动生成AI修改建议并显示
    generateAndDisplayModifications(result.contract_text || '', analysis);
    
    // 显示结果区域
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'block';
    
    // 刷新历史记录和统计
    loadHistory();
    loadStatistics();
}

// 自动生成并显示修改建议
async function generateAndDisplayModifications(originalText, analysis) {
    try {
        // 显示加载状态提示
        showMessage('AI正在优化合同，生成合规协议...', 'info');
        
        const response = await fetch('/api/ai-modify-contract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                original_text: originalText,
                analysis: analysis
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 检查AI返回的修改建议是否有效
        if (!result.modified_text || result.modified_text === originalText) {
            console.warn('AI返回的优化建议与原文相同，使用基础优化建议');
            // 如果AI没有提供有效修改，使用基础修改建议
            const fallbackResult = await generateFallbackModifications(originalText, analysis);
            displayModificationResult(fallbackResult, originalText);
        } else {
            // 显示AI修改建议
            displayModificationResult(result, originalText);
        }
        
        showMessage('AI合同优化完成！', 'success');
        
    } catch (error) {
        console.error('生成AI优化建议失败:', error);
        showMessage(`生成AI优化建议失败: ${error.message}`, 'danger');
        
        // 如果AI生成失败，使用基础修改建议
        try {
            const fallbackResult = await generateFallbackModifications(originalText, analysis);
            displayModificationResult(fallbackResult, originalText);
        } catch (fallbackError) {
            console.error('基础优化建议也失败:', fallbackError);
            // 显示原文
            const originalTextarea = document.getElementById('originalContractText');
            if (originalTextarea) {
                originalTextarea.value = originalText;
            }
        }
    }
}

// 生成基础修改建议
async function generateFallbackModifications(originalText, analysis) {
    // 基于合同内容分析生成基础修改建议
    const modifications = [];
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
    const modifiedText = applyModificationsToText(originalText, modifications);

    return {
        modified_text: modifiedText,
        modifications: modifications,
        summary: "基于相关法律法规的合规性优化建议"
    };
}

// 应用修改到文本
function applyModificationsToText(originalText, modifications) {
    let modifiedText = originalText;
    
    // 按照位置排序，从后往前修改，避免位置偏移
    const sortedModifications = modifications.sort((a, b) => {
        const aPos = originalText.indexOf(a.original_text || '');
        const bPos = originalText.indexOf(b.original_text || '');
        return bPos - aPos;
    });
    
    sortedModifications.forEach(mod => {
        if (mod.type === 'modify' && mod.original_text && mod.suggested_text) {
            modifiedText = modifiedText.replace(mod.original_text, mod.suggested_text);
        } else if (mod.type === 'add' && mod.suggested_text) {
            // 在适当位置添加新条款
            if (mod.position.includes("法律声明")) {
                modifiedText += `\n\n第九条 法律声明\n${mod.suggested_text}`;
            } else if (mod.position.includes("合同主体")) {
                // 在合同开头添加主体信息
                modifiedText = `第一条 合同主体\n${mod.suggested_text}\n\n${modifiedText}`;
            } else if (mod.position.includes("争议解决")) {
                // 在合同末尾添加争议解决条款
                modifiedText += `\n\n第九条 争议解决\n${mod.suggested_text}`;
            } else {
                modifiedText += `\n\n${mod.suggested_text}`;
            }
        }
    });
    
    return modifiedText;
}

// 显示修改结果
function displayModificationResult(result, originalText) {
    // 显示AI修改建议
    const originalTextarea = document.getElementById('originalContractText');
    if (originalTextarea && result.modified_text) {
        originalTextarea.value = result.modified_text;
        // 更新全局变量
        window.originalContractText = result.modified_text;
    }
    
    // 显示AI修改详情对比
    if (result.modifications && result.modifications.length > 0) {
        showAIModificationDetails(result.modifications, originalText);
    }
    
    // 显示相关按钮
    const applyBtn = document.getElementById('applyAIBtn');
    const downloadBtn = document.getElementById('downloadAIBtn');
    
    if (applyBtn) applyBtn.style.display = 'inline-block';
    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    
    // 高亮显示修改后的内容中的关键修改点
    highlightModifiedContent(result.modified_text, result.modifications);
    
    // 显示修改总结
    if (result.summary) {
        showMessage(`合同优化完成：${result.summary}`, 'success');
    }
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
    document.getElementById('originalContractText').value = contractText;
    
    // 重置AI修改建议相关按钮
    document.getElementById('applyAIBtn').style.display = 'none';
    document.getElementById('downloadAIBtn').style.display = 'none';
    document.getElementById('aiModificationDetails').style.display = 'none';
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

// 生成AI修改建议
async function generateModifications(event) {
    if (!currentAnalysis) {
        showMessage('请先进行合同分析！', 'warning');
        return;
    }
    
    try {
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
                current_text: originalContractText, // 使用原文作为当前文本
                analysis: currentAnalysis.analysis
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 显示修改建议
        document.getElementById('aiModifiedText').value = result.modified_text;
        
        // 显示修改详情
        if (result.modifications && result.modifications.length > 0) {
            showAIModificationDetails(result.modifications, originalContractText);
        }
        
        // 显示相关按钮
        document.getElementById('applyAIBtn').style.display = 'inline-block';
        document.getElementById('downloadAIBtn').style.display = 'inline-block';
        
        showMessage('AI修改建议生成成功！', 'success');
        
    } catch (error) {
        console.error('生成修改建议失败:', error);
        showMessage(`生成修改建议失败: ${error.message}`, 'danger');
    } finally {
        // 恢复按钮状态
        const button = event.target;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 生成AI修改建议（新功能）
async function generateAIModifications(event) {
    if (!currentAnalysis) {
        showMessage('请先进行合同分析！', 'warning');
        return;
    }
    
    try {
        // 显示加载状态
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI正在分析并生成修改建议...';
        button.disabled = true;
        
        const response = await fetch('/api/ai-modify-contract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                original_text: originalContractText,
                analysis: currentAnalysis.analysis
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 显示AI修改建议
        document.getElementById('aiModifiedText').value = result.modified_text;
        
        // 显示AI修改详情对比
        if (result.modifications && result.modifications.length > 0) {
            showAIModificationDetails(result.modifications, originalContractText);
        }
        
        // 显示相关按钮
        document.getElementById('applyAIBtn').style.display = 'inline-block';
        document.getElementById('downloadAIBtn').style.display = 'inline-block';
        
        // 高亮显示修改后的内容
        highlightModifiedContent(originalContractText, result.modified_text);
        
        showMessage('AI智能修改建议生成成功！', 'success');
        
    } catch (error) {
        console.error('生成AI修改建议失败:', error);
        showMessage(`生成AI修改建议失败: ${error.message}`, 'danger');
    } finally {
        // 恢复按钮状态
        const button = event.target;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 高亮显示修改后的内容中的关键修改点
function highlightModifiedContent(modifiedText, modifications) {
    const textarea = document.getElementById('originalContractText');
    if (!textarea) return;
    
    // 创建带有高亮的HTML内容
    const highlightedText = highlightModificationsInText(modifiedText, modifications);
    
    // 创建可读的HTML显示区域
    const displayDiv = document.createElement('div');
    displayDiv.className = 'highlighted-text modified-text';
    displayDiv.innerHTML = highlightedText;
    
    // 隐藏textarea，显示HTML
    textarea.style.display = 'none';
    
    // 在textarea后面插入HTML显示
    textarea.parentNode.insertBefore(displayDiv, textarea.nextSibling);
    
    // 添加切换按钮
    addToggleButton(textarea, displayDiv);
}

// 在修改后的文本中高亮修改点
function highlightModificationsInText(text, modifications) {
    let highlightedText = text;
    
    if (modifications && modifications.length > 0) {
        // 按照位置排序，从后往前修改，避免位置偏移
        const sortedModifications = modifications.sort((a, b) => {
            const aPos = text.indexOf(a.suggested_text || '');
            const bPos = text.indexOf(b.suggested_text || '');
            return bPos - aPos;
        });
        
        sortedModifications.forEach(mod => {
            if (mod.type === 'modify' && mod.original_text && mod.suggested_text) {
                // 高亮修改的部分
                const highlightedMod = `<span class="highlight-warning" title="原文：${escapeHtml(mod.original_text)}">${escapeHtml(mod.suggested_text)}</span>`;
                highlightedText = highlightedText.replace(mod.suggested_text, highlightedMod);
            } else if (mod.type === 'add' && mod.suggested_text) {
                // 高亮新增的部分
                const highlightedAdd = `<span class="highlight-success" title="新增条款">${escapeHtml(mod.suggested_text)}</span>`;
                highlightedText = highlightedText.replace(mod.suggested_text, highlightedAdd);
            } else if (mod.type === 'delete' && mod.original_text) {
                // 高亮删除的部分（如果还在文本中）
                const highlightedDelete = `<span class="highlight-danger" title="已删除">${escapeHtml(mod.original_text)}</span>`;
                highlightedText = highlightedText.replace(mod.original_text, highlightedDelete);
            }
        });
    }
    
    return highlightedText.replace(/\n/g, '<br>');
}

// 添加切换按钮
function addToggleButton(textarea, displayDiv) {
    const container = textarea.parentNode;
    
    // 创建切换按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-sm btn-outline-secondary mb-2';
    toggleBtn.innerHTML = '<i class="fas fa-code"></i> 显示原始文本';
    toggleBtn.onclick = () => toggleTextDisplay(textarea, displayDiv, toggleBtn);
    
    // 插入按钮
    container.insertBefore(toggleBtn, displayDiv);
}

// 切换文本显示
function toggleTextDisplay(textarea, displayDiv, button) {
    if (textarea.style.display === 'none') {
        // 显示HTML高亮版本
        textarea.style.display = 'none';
        displayDiv.style.display = 'block';
        button.innerHTML = '<i class="fas fa-code"></i> 显示原始文本';
    } else {
        // 显示原始textarea
        textarea.style.display = 'block';
        displayDiv.style.display = 'none';
        button.innerHTML = '<i class="fas fa-eye"></i> 显示高亮版本';
    }
}

// 高亮差异内容
function highlightDifferences(originalText, modifiedText, type) {
    if (type === 'original') {
        // 在原文中高亮需要修改的部分
        return highlightTextDifferences(originalText, modifiedText, 'removed');
    } else {
        // 在修改建议中高亮新增或修改的部分
        return highlightTextDifferences(modifiedText, originalText, 'added');
    }
}

// 智能文本差异高亮
function highlightTextDifferences(text1, text2, highlightType) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');
    
    let highlightedText = '';
    
    for (let i = 0; i < Math.max(lines1.length, lines2.length); i++) {
        const line1 = lines1[i] || '';
        const line2 = lines2[i] || '';
        
        if (line1 !== line2) {
            // 行不同，进行词级别比较
            const highlightedLine = highlightLineDifferences(line1, line2, highlightType);
            highlightedText += `<div class="diff-line ${highlightType}">${highlightedLine}</div>`;
        } else {
            // 行相同，正常显示
            highlightedText += `<div class="diff-line">${escapeHtml(line1)}</div>`;
        }
    }
    
    return highlightedText;
}

// 高亮行内差异
function highlightLineDifferences(line1, line2, highlightType) {
    const words1 = line1.split(/(\s+)/);
    const words2 = line2.split(/(\s+)/);
    
    let highlightedLine = '';
    let i = 0, j = 0;
    
    while (i < words1.length || j < words2.length) {
        const word1 = words1[i] || '';
        const word2 = words2[j] || '';
        
        if (word1 === word2) {
            // 词相同，正常显示
            highlightedLine += escapeHtml(word1);
            i++;
            j++;
        } else {
            // 词不同，高亮显示
            if (highlightType === 'removed' && word1) {
                highlightedLine += `<span class="highlight-danger">${escapeHtml(word1)}</span>`;
                i++;
            } else if (highlightType === 'added' && word2) {
                highlightedLine += `<span class="highlight-success">${escapeHtml(word2)}</span>`;
                j++;
            } else {
                // 处理长度不同的情况
                if (word1) {
                    highlightedLine += `<span class="highlight-danger">${escapeHtml(word1)}</span>`;
                    i++;
                }
                if (word2) {
                    highlightedLine += `<span class="highlight-success">${escapeHtml(word2)}</span>`;
                    j++;
                }
            }
        }
    }
    
    return highlightedLine;
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 应用AI修改建议
async function applyModifications(event) {
    if (!currentAnalysis) {
        showMessage('请先进行合同分析！', 'warning');
        return;
    }
    
    try {
        const modifiedText = document.getElementById('aiModifiedText').value;
        
        if (!modifiedText.trim()) {
            showMessage('请先生成AI修改建议！', 'warning');
            return;
        }
        
        // 显示加载状态
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在应用修改...';
        button.disabled = true;
        
        // 将修改后的内容应用到原文
        document.getElementById('originalContractText').value = modifiedText;
        originalContractText = modifiedText;
        
        // 清空修改建议
        document.getElementById('aiModifiedText').value = '';
        
        // 隐藏相关按钮
        document.getElementById('applyAIBtn').style.display = 'none';
        document.getElementById('downloadAIBtn').style.display = 'none';
        document.getElementById('aiModificationDetails').style.display = 'none';
        
        showMessage('修改建议已应用！', 'success');
        
    } catch (error) {
        console.error('应用修改失败:', error);
        showMessage(`应用修改失败: ${error.message}`, 'danger');
    } finally {
        // 恢复按钮状态
        const button = event.target;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}



// 显示AI修改详情对比（新功能）
function showAIModificationDetails(modifications, originalText) {
    const aiModificationList = document.getElementById('aiModificationList');
    const aiModificationDetails = document.getElementById('aiModificationDetails');
    
    if (!modifications || modifications.length === 0) {
        aiModificationDetails.style.display = 'none';
        return;
    }
    
    const detailsHtml = modifications.map((mod, index) => {
        const typeBadge = mod.type === 'add' ? 'success' : mod.type === 'modify' ? 'warning' : 'danger';
        const typeText = mod.type === 'add' ? '新增' : mod.type === 'modify' ? '修改' : '删除';
        const typeIcon = mod.type === 'add' ? 'plus-circle' : mod.type === 'modify' ? 'edit' : 'trash';
        
        return `
            <div class="ai-modification-item">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h6 class="mb-0">
                        <i class="fas fa-${typeIcon}"></i> 合同优化 ${index + 1}: ${typeText}
                    </h6>
                    <span class="badge bg-${typeBadge} modification-type-badge">${typeText}</span>
                </div>
                
                <div class="text-comparison">
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-danger mb-2">
                                <i class="fas fa-exclamation-triangle"></i> 原文内容
                            </h6>
                            ${mod.original_text ? `
                                <div class="text-original">
                                    <strong>位置:</strong> <span class="badge bg-secondary">${mod.position || '未指定'}</span><br>
                                    <strong>内容:</strong><br>
                                    <div class="highlight-danger p-2 rounded">${escapeHtml(mod.original_text)}</div>
                                </div>
                            ` : '<p class="text-muted">无原文内容（新增项）</p>'}
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-success mb-2">
                                <i class="fas fa-lightbulb"></i> 优化后内容
                            </h6>
                            ${mod.suggested_text ? `
                                <div class="text-suggested">
                                    <strong>优化内容:</strong><br>
                                    <div class="highlight-success p-2 rounded">${escapeHtml(mod.suggested_text)}</div>
                                </div>
                            ` : '<p class="text-muted">无优化内容</p>'}
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <h6 class="text-info mb-2">
                            <i class="fas fa-gavel"></i> 法律依据
                        </h6>
                        <div class="text-reason">
                            <strong>优化原因:</strong> ${escapeHtml(mod.reason || '未提供')}<br>
                            <strong>相关法条:</strong> <span class="badge bg-primary">${escapeHtml(mod.related_article || '未指定')}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    aiModificationList.innerHTML = detailsHtml;
    aiModificationDetails.style.display = 'block';
}

// 下载修改后的合同
function downloadModifiedContract() {
    const modifiedText = document.getElementById('aiModifiedText').value;
    
    if (!modifiedText.trim()) {
        showMessage('没有可下载的修改建议！', 'warning');
        return;
    }
    
    const blob = new Blob([modifiedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI修改建议_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('修改建议文件下载成功！', 'success');
}

// 应用AI修改建议（新功能）
async function applyAIModifications(event) {
    if (!currentAnalysis) {
        showMessage('请先进行合同分析！', 'warning');
        return;
    }
    
    try {
        const modifiedText = document.getElementById('originalContractText').value;
        
        if (!modifiedText.trim()) {
            showMessage('没有可应用的修改建议！', 'warning');
            return;
        }
        
        // 显示加载状态
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在应用AI修改...';
        button.disabled = true;
        
        // 修改建议已经应用，显示成功消息
        showMessage('AI修改建议已应用！', 'success');
        
        // 隐藏相关按钮
        document.getElementById('applyAIBtn').style.display = 'none';
        document.getElementById('downloadAIBtn').style.display = 'none';
        document.getElementById('aiModificationDetails').style.display = 'none';
        
    } catch (error) {
        console.error('应用AI修改失败:', error);
        showMessage(`应用AI修改失败: ${error.message}`, 'danger');
    } finally {
        // 恢复按钮状态
        const button = event.target;
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 下载AI修改后的合同（新功能）
function downloadAIModifiedContract() {
    const modifiedText = document.getElementById('originalContractText').value;
    
    if (!modifiedText.trim()) {
        showMessage('没有可下载的修改后内容！', 'warning');
        return;
    }
    
    const blob = new Blob([modifiedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI修改后合同_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('修改后合同文件下载成功！', 'success');
}

// 返回上传界面
function backToUpload() {
    // 隐藏结果区域
    document.getElementById('resultSection').style.display = 'none';
    
    // 显示上传区域
    document.getElementById('uploadSection').style.display = 'block';
    
    // 清理高亮显示
    cleanupHighlightedContent();
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    showMessage('已返回上传界面', 'info');
}

// 重新分析
function resetAnalysis() {
    clearFile();
    currentAnalysis = null;
    originalContractText = '';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    
    // 重置合同修改区域
    document.getElementById('originalContractText').value = '';
    
    // 重置AI修改建议区域
    document.getElementById('aiModificationDetails').style.display = 'none';
    document.getElementById('applyAIBtn').style.display = 'none';
    document.getElementById('downloadAIBtn').style.display = 'none';
    
    // 清理高亮显示
    cleanupHighlightedContent();
    
    // 滚动到页面顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 清理高亮显示内容
function cleanupHighlightedContent() {
    // 移除所有高亮文本显示
    const highlightedTexts = document.querySelectorAll('.highlighted-text');
    highlightedTexts.forEach(element => element.remove());
    
    // 移除所有切换按钮
    const toggleButtons = document.querySelectorAll('.toggle-text-btn');
    toggleButtons.forEach(element => element.remove());
    
    // 恢复textarea显示
    const originalTextarea = document.getElementById('originalContractText');
    
    if (originalTextarea) {
        originalTextarea.style.display = 'block';
        originalTextarea.value = '';
    }
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
        console.log('开始加载历史记录...');
        const response = await fetch('/api/history');
        console.log('历史记录API响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`加载历史记录失败: HTTP ${response.status}`);
        }
        
        const history = await response.json();
        console.log('获取到的历史记录:', history);
        
        const historyList = document.getElementById('historyList');
        if (!history || history.length === 0) {
            historyList.innerHTML = '<p class="text-muted">暂无分析历史</p>';
            return;
        }
        
        const historyHtml = history.slice(0, 5).map(item => {
            console.log('处理历史记录项:', item);
            return `
                <div class="history-item" onclick="viewHistoryDetail('${item.id}')" style="cursor: pointer; padding: 20px; border: 1px solid #dee2e6; border-radius: 10px; margin-bottom: 15px; transition: all 0.3s ease; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <h6 class="mb-2 text-primary">${item.original_name || '未知文件'}</h6>
                            <div class="d-flex align-items-center mb-2">
                                <i class="fas fa-clock text-muted me-2"></i>
                                <small class="text-muted">分析时间: ${new Date(item.created_at).toLocaleString()}</small>
                            </div>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-fingerprint text-info me-2"></i>
                                <small class="text-info">ID: ${item.id.substring(0, 8)}...</small>
                            </div>
                        </div>
                        <div class="text-end ms-3">
                            <div class="badge bg-${getScoreBadgeColor(item.risk_score)} fs-5 px-3 py-2 mb-2">
                                ${item.risk_score || 0}分
                            </div>
                            <br>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteHistory('${item.id}', event)" title="删除记录">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-center mt-3">
                        <small class="text-muted">
                            <i class="fas fa-hand-pointer me-1"></i> 点击查看详细分析结果
                        </small>
                    </div>
                </div>
            `;
        }).join('');
        
        historyList.innerHTML = historyHtml;
        console.log('历史记录HTML已更新');
    } catch (error) {
        console.error('加载历史记录失败:', error);
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = `<p class="text-danger">加载历史记录失败: ${error.message}</p>`;
    }
}

// 查看历史详情
async function viewHistoryDetail(id) {
    try {
        console.log('正在获取历史详情，ID:', id);
        
        // 显示加载状态
        showMessage('正在加载历史详情...', 'info');
        
        // 添加调试信息
        console.log('请求URL:', `/api/analysis/${id}`);
        
        const response = await fetch(`/api/analysis/${id}`);
        console.log('响应状态:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API响应错误:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contract = await response.json();
        console.log('获取到的合同数据:', contract);
        
        if (!contract) {
            throw new Error('未找到合同数据');
        }
        
        if (!contract.analysis_result) {
            throw new Error('合同缺少分析结果数据');
        }
        
        // 保存当前合同数据到全局变量，供弹框使用
        window.currentHistoryContract = contract;
        
        // 显示历史详情弹框
        displayHistoryDetailModal(contract);
        
        showMessage('历史详情加载成功！', 'success');
    } catch (error) {
        console.error('获取历史详情失败:', error);
        showMessage(`获取历史详情失败: ${error.message}`, 'danger');
    }
}

// 显示历史详情弹框
function displayHistoryDetailModal(contract) {
    console.log('显示历史详情弹框，合同数据:', contract);
    
    if (!contract || !contract.analysis_result) {
        console.error('合同数据不完整，无法显示详情');
        showMessage('合同数据不完整，无法显示详情', 'danger');
        return;
    }
    
    const analysis = contract.analysis_result;
    console.log('分析结果数据:', analysis);
    
    try {
        const modalElement = document.getElementById('historyDetailModal');
        if (!modalElement) {
            console.error('找不到模态框元素');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        
        // 更新弹框标题
        const titleElement = document.getElementById('historyDetailModalLabel');
        if (titleElement) {
            titleElement.innerHTML = `<i class="fas fa-file-alt"></i> 分析详情 - ${contract.original_name || '未知文件'}`;
        }
        
        // 生成弹框内容
        const content = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="fas fa-chart-line"></i> 合规评分</h6>
                        </div>
                        <div class="card-body text-center">
                            <div class="display-4 text-${getScoreBadgeColor(analysis.compliance_score || 0)}">
                                ${analysis.compliance_score || 0}分
                            </div>
                            <p class="text-muted mt-2">
                                ${getScoreDescription(analysis.compliance_score || 0)}
                            </p>
                        </div>
                    </div>
                    
                    <div class="card mb-3">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fas fa-info-circle"></i> 分析摘要</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">${analysis.analysis_summary || '暂无分析摘要'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card mb-3">
                        <div class="card-header bg-warning text-white">
                            <h6 class="mb-0"><i class="fas fa-exclamation-triangle"></i> 风险因素</h6>
                        </div>
                        <div class="card-body">
                            ${displayRiskFactorsInModal(analysis.risk_factors || [])}
                        </div>
                    </div>
                    
                    <div class="card mb-3">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-lightbulb"></i> 改进建议</h6>
                        </div>
                        <div class="card-body">
                            ${displaySuggestionsInModal(analysis.suggestions || [])}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-secondary text-white">
                            <h6 class="mb-0"><i class="fas fa-gavel"></i> 涉及相关条例</h6>
                        </div>
                        <div class="card-body">
                            ${displayRegulationsInModal(analysis.matched_articles || [])}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <h6 class="mb-0"><i class="fas fa-file-alt"></i> 合同内容预览</h6>
                        </div>
                        <div class="card-body">
                            <div class="contract-preview">
                                <textarea class="form-control" rows="8" readonly>${contract.content || '暂无内容'}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const contentElement = document.getElementById('historyDetailContent');
        if (contentElement) {
            contentElement.innerHTML = content;
        }
        
        modal.show();
        console.log('模态框显示成功');
        
    } catch (error) {
        console.error('显示历史详情弹框时出错:', error);
        showMessage(`显示详情失败: ${error.message}`, 'danger');
    }
}

// 在弹框中显示风险因素
function displayRiskFactorsInModal(riskFactors) {
    if (!riskFactors || riskFactors.length === 0) {
        return '<p class="text-success mb-0">未发现明显风险因素</p>';
    }
    
    return riskFactors.map(risk => `
        <div class="alert alert-${getRiskAlertType(risk.severity)} mb-2">
            <strong>${risk.type}:</strong> ${risk.description}
            <br><small class="text-muted">建议: ${risk.suggestion}</small>
        </div>
    `).join('');
}

// 在弹框中显示改进建议
function displaySuggestionsInModal(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        return '<p class="text-muted mb-0">暂无具体建议</p>';
    }
    
    return suggestions.map(suggestion => `
        <div class="alert alert-info mb-2">
            <i class="fas fa-lightbulb"></i> ${suggestion}
        </div>
    `).join('');
}

// 在弹框中显示相关条例
function displayRegulationsInModal(regulations) {
    if (!regulations || regulations.length === 0) {
        return '<p class="text-muted mb-0">未发现相关条例</p>';
    }
    
    return regulations.map(regulation => `
        <div class="alert alert-${regulation.compliance ? 'success' : 'warning'} mb-2">
            <h6 class="mb-1"><i class="fas fa-gavel"></i> ${regulation.article}</h6>
            <p class="mb-1">${regulation.description}</p>
            <small class="text-muted">
                <i class="fas fa-${regulation.compliance ? 'check-circle text-success' : 'exclamation-circle text-danger'}"></i>
                ${regulation.compliance ? '符合要求' : '需要关注'}
            </small>
        </div>
    `).join('');
}

// 获取分数描述
function getScoreDescription(score) {
    if (score >= 90) return '优秀 - 合同基本符合对外贸易法要求';
    if (score >= 70) return '良好 - 建议完善部分条款';
    if (score >= 50) return '一般 - 需要重点关注风险因素';
    return '较差 - 建议咨询专业律师';
}

// 查看完整分析（跳转到分析结果页面）
function viewFullAnalysis() {
    if (!window.currentHistoryContract) {
        showMessage('没有可查看的分析数据', 'warning');
        return;
    }
    
    const contract = window.currentHistoryContract;
    
    // 显示分析结果
    displayResults({
        id: contract.id,
        filename: contract.original_name,
        analysis: contract.analysis_result,
        contract_text: contract.content || contract.contract_text
    });
    
    // 关闭弹框
    const modal = bootstrap.Modal.getInstance(document.getElementById('historyDetailModal'));
    modal.hide();
    
    // 滚动到结果区域
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    
    showMessage('已跳转到完整分析页面', 'success');
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

// 显示消息提示
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 3秒后自动消失
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// 导出报告
function exportReport() {
    if (!currentAnalysis) {
        showMessage('请先进行合同分析！', 'warning');
        return;
    }
    
    const score = document.getElementById('complianceScore').textContent;
    const description = document.getElementById('scoreDescription').textContent;
    const summary = document.getElementById('analysisSummary').textContent;
    const regulations = document.getElementById('regulationsList').innerText;
    const riskFactors = document.getElementById('riskFactorsList').innerText;
    const suggestions = document.getElementById('suggestionsList').innerText;
    const originalText = document.getElementById('originalContractText').value;
    const modifiedText = document.getElementById('aiModifiedText').value;
    
    let report = `
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

=== 合同原文 ===
${originalText}

`;

    if (modifiedText.trim()) {
        report += `=== AI修改建议 ===
${modifiedText}

`;
    }
    
    report += `---
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
    
    showMessage('分析报告导出成功！', 'success');
} 