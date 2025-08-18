// 全局变量
let selectedFile = null;
let currentAnalysis = null;
let originalContractText = '';
let selectedPrimaryLaw = '';
let selectedSecondaryLaw = '';
let translatedContent = {};
let currentLanguage = 'zh';

// 分析进度状态
let analysisProgress = {
  step: 0,
  totalSteps: 3,
  currentStep: '',
  isAnalyzing: false
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeFileInput();
    loadHistory();
    loadStatistics();
    initializeLawSelection();
    
    // 添加页面卸载时的清理
    window.addEventListener('beforeunload', function() {
        cleanupAllModals();
    });
    
    // 添加全局错误处理
    window.addEventListener('error', function(event) {
        if (event.error && event.error.message && event.error.message.includes('classList')) {
            console.warn('检测到classList错误，尝试清理模态框状态');
            try {
                cleanupAllModals();
            } catch (e) {
                console.warn('清理模态框状态失败:', e);
            }
        }
    });
});

// 安全的DOM状态检查函数
function isElementSafe(element, property) {
    try {
        return element && 
               element[property] && 
               typeof element[property] === 'object' && 
               element[property] !== null;
    } catch (e) {
        return false;
    }
}

// 安全的属性操作函数
function safeRemoveClass(element, className) {
    try {
        if (isElementSafe(element, 'classList') && typeof element.classList.remove === 'function') {
            element.classList.remove(className);
            return true;
        }
        return false;
    } catch (e) {
        console.warn('安全移除CSS类时出错:', e);
        return false;
    }
}

function safeSetStyle(element, property, value) {
    try {
        if (isElementSafe(element, 'style')) {
            element.style[property] = value;
            return true;
        }
        return false;
    } catch (e) {
        console.warn('安全设置样式时出错:', e);
        return false;
    }
}

// 清理所有模态框
function cleanupAllModals() {
    try {
        // 查找所有模态框实例并清理
        const modalElements = document.querySelectorAll('.modal');
        modalElements.forEach(modalElement => {
            if (modalElement) {
                try {
                    const modal = bootstrap.Modal.getInstance(modalElement);
                    if (modal) {
                        modal.dispose();
                    }
                } catch (e) {
                    console.warn('清理模态框实例时出错:', e);
                }
                
                // 重置模态框状态
                try {
                    modalElement.style.display = 'none';
                    modalElement.setAttribute('aria-hidden', 'true');
                    modalElement.removeAttribute('aria-modal');
                } catch (e) {
                    console.warn('重置模态框状态时出错:', e);
                }
            }
        });
        
        // 安全地清理页面状态
        safeRemoveClass(document.body, 'modal-open');
        safeSetStyle(document.body, 'overflow', '');
        safeSetStyle(document.body, 'paddingRight', '');
        
        // 安全地移除所有背景遮罩
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
            if (backdrop && backdrop.parentNode) {
                try {
                    backdrop.remove();
                } catch (e) {
                    console.warn('移除背景遮罩时出错:', e);
                }
            }
        });
        
    } catch (error) {
        console.warn('清理模态框时出错:', error);
    }
}

// 初始化法律选择
function initializeLawSelection() {
    // 设置默认选择（中国法律）
    document.getElementById('primaryLaw').value = 'china';
    selectedPrimaryLaw = 'china';
    
    // 添加选择变化事件监听
    document.getElementById('primaryLaw').addEventListener('change', function() {
        updateLawSelection();
    });
    
    document.getElementById('secondaryLaw').addEventListener('change', function() {
        updateLawSelection();
    });
    
    // 初始化显示
    updateLawSelectionDisplay();
}

// 法律选择功能（自动更新，无需确认按钮）
function updateLawSelection() {
    const primaryLaw = document.getElementById('primaryLaw').value;
    const secondaryLaw = document.getElementById('secondaryLaw').value;
    
    if (!primaryLaw) {
        return; // 如果没有选择主要法律，不显示消息
    }
    
    // 检查是否选择了相同的法律体系
    if (secondaryLaw && primaryLaw === secondaryLaw) {
        showMessage('甲方和乙方不能选择相同的法律体系！', 'warning');
        // 清空次要法律选择
        document.getElementById('secondaryLaw').value = '';
        selectedSecondaryLaw = '';
        return;
    }
    
    selectedPrimaryLaw = primaryLaw;
    selectedSecondaryLaw = secondaryLaw;
    
    // 更新UI显示
    updateLawSelectionDisplay();
    
    // 显示选择结果（仅在有效选择时）
    if (primaryLaw && secondaryLaw) {
        let message = `已选择甲方国家法律: ${getLawDisplayName(primaryLaw)}，乙方国家法律: ${getLawDisplayName(secondaryLaw)}`;
        message += '\n\nAI将确保合同同时符合两个国家的法律要求，在两国都具有法律效力。';
        showMessage(message, 'success');
    }
}

// 获取法律体系显示名称
function getLawDisplayName(lawCode) {
    const lawNames = {
        'china': '中华人民共和国法律',
        'usa': '美国法律 (U.S. Law)',
        'eu': '欧盟法律 (EU Law)',
        'uk': '英国法律 (UK Law)',
        'japan': '日本法律 (Japanese Law)',
        'singapore': '新加坡法律 (Singapore Law)'
    };
    return lawNames[lawCode] || lawCode;
}

// 更新法律选择显示
function updateLawSelectionDisplay() {
    const primarySelect = document.getElementById('primaryLaw');
    const secondarySelect = document.getElementById('secondaryLaw');
    
    // 添加选中状态的视觉反馈
    if (selectedPrimaryLaw) {
        primarySelect.classList.add('is-valid');
        primarySelect.classList.remove('is-invalid');
    }
    
    if (selectedSecondaryLaw) {
        secondarySelect.classList.add('is-valid');
        secondarySelect.classList.remove('is-invalid');
    }
}

// 翻译功能
function translateContract() {
    const translationControls = document.getElementById('translationControls');
    if (translationControls.style.display === 'none') {
        translationControls.style.display = 'block';
        // 根据选择的法律体系设置默认目标语言
        setDefaultTargetLanguage();
    } else {
        translationControls.style.display = 'none';
    }
}

// 设置默认目标语言
function setDefaultTargetLanguage() {
    const targetLanguage = document.getElementById('targetLanguage');
    
    // 根据选择的法律体系设置对应的语言
    const languageMap = {
        'usa': 'en',
        'uk': 'en',
        'eu': 'en', // 欧盟主要使用英语
        'japan': 'ja',
        'singapore': 'en', // 新加坡主要使用英语
        'china': 'en' // 中国法律翻译成英语
    };
    
    if (selectedPrimaryLaw && languageMap[selectedPrimaryLaw]) {
        targetLanguage.value = languageMap[selectedPrimaryLaw];
    }
}

// 执行翻译
async function performTranslation() {
    const targetLanguage = document.getElementById('targetLanguage').value;
    if (!targetLanguage) {
        showMessage('请选择目标语言！', 'warning');
        return;
    }
    
    try {
        showMessage('正在翻译...', 'info');
        
        // 获取需要翻译的内容
        const originalText = document.getElementById('originalTextContent').textContent;
        const modifiedText = document.getElementById('modifiedTextContent').textContent;
        const modifications = getModificationSuggestions();
        
        // 创建翻译请求
        const translationData = {
            originalText: originalText,
            modifiedText: modifiedText,
            modifications: modifications,
            targetLanguage: targetLanguage,
            primaryLaw: selectedPrimaryLaw,
            secondaryLaw: selectedSecondaryLaw
        };
        
        // 显示翻译说明
        const lawInfo = `正在将合同翻译成${getLanguageDisplayName(targetLanguage)}，确保同时符合${getLawDisplayName(selectedPrimaryLaw)}${selectedSecondaryLaw ? `和${getLawDisplayName(selectedSecondaryLaw)}` : ''}的法律要求...`;
        showMessage(lawInfo, 'info');
        
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(translationData)
        });
        
        if (!response.ok) {
            throw new Error(`翻译请求失败: ${response.status}`);
        }
        
        const result = await response.json();
        
        // 检查翻译结果是否有错误
        if (result.error) {
            throw new Error(result.error);
        }
        
        // 存储翻译结果
        translatedContent[targetLanguage] = result;
        
        // 显示翻译结果
        displayTranslatedContent(targetLanguage, result);
        
        showMessage('翻译完成！', 'success');
        
    } catch (error) {
        console.error('翻译失败:', error);
        showMessage('翻译失败: ' + error.message, 'error');
    }
}

// 获取修改建议（从当前分析结果中获取）
function getModificationSuggestions() {
    if (!currentAnalysis || !currentAnalysis.analysis.contract_optimization) {
        return [];
    }
    
    const modifications = currentAnalysis.analysis.contract_optimization.modifications || [];
    return modifications.map(mod => ({
        type: mod.type || '',
        text: mod.original_text || '',
        reason: mod.reason || '',
        lawRef: mod.related_article || ''
    }));
}

// 显示翻译后的内容
function displayTranslatedContent(targetLanguage, result) {
    // 更新原文合同
    if (result.originalText) {
        document.getElementById('originalTextContent').innerHTML = result.originalText;
        document.getElementById('originalTextContent').classList.add('translated');
    }
    
    // 更新修改后合同
    if (result.modifiedText) {
        document.getElementById('modifiedTextContent').innerHTML = result.modifiedText;
        document.getElementById('modifiedTextContent').classList.add('translated');
    }
    
    // 更新修改建议
    if (result.modifications) {
        displayTranslatedModifications(result.modifications);
    }
    
    // 更新当前语言
    currentLanguage = targetLanguage;
    
    // 显示语言切换按钮
    showLanguageToggle();
    
    // 如果之前开启了高亮模式，重新应用高亮
    if (document.getElementById('originalTextContent').classList.contains('highlight-mode')) {
        applyHighlights();
    }
}

// 显示翻译后的修改建议（已集成到高亮功能中）
function displayTranslatedModifications(translatedModifications) {
    // 翻译后的修改建议已集成到高亮功能中
    // 用户可以通过点击高亮查看修改详情
    console.log('翻译后的修改建议已集成到高亮功能中');
}

// 显示修改建议（已集成到高亮功能中）
function displayModifications(modifications) {
    // 修改建议已集成到高亮功能中
    // 用户可以通过点击高亮查看修改详情
    console.log('修改建议已集成到高亮功能中');
}

// 显示翻译版本（AI翻译后的合同）
function displayTranslatedVersion(translation) {
    const translatedContent = document.getElementById('translatedTextContent');
    if (translatedContent && translation.translated_text) {
        // 显示翻译后的文本
        translatedContent.innerHTML = translation.translated_text.replace(/\n/g, '<br>');
        translatedContent.classList.add('translated');
        
        console.log('翻译版本显示完成，目标语言:', translation.target_language);
        console.log('翻译文本长度:', translation.translated_text.length);
        
        // 存储翻译信息用于下载
        window.currentTranslation = translation;
    } else {
        console.error('翻译内容为空或翻译容器不存在');
    }
}

// 显示语言切换按钮
function showLanguageToggle() {
    const panelHeader = document.querySelector('.comparison-panel .panel-header h5');
    if (panelHeader && currentLanguage !== 'zh') {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn btn-sm btn-outline-secondary ms-2';
        toggleBtn.innerHTML = '<i class="fas fa-language"></i> 切换中文';
        toggleBtn.onclick = toggleToChinese;
        panelHeader.appendChild(toggleBtn);
    }
}

// 切换回中文
function toggleToChinese() {
    // 恢复原始中文内容
    if (currentAnalysis) {
        displayResults(currentAnalysis);
    }
    
    // 隐藏语言切换按钮
    const toggleBtn = document.querySelector('.panel-header .btn-outline-secondary');
    if (toggleBtn) {
        toggleBtn.remove();
    }
    
    // 重置翻译状态
    currentLanguage = 'zh';
    translatedContent = {};
    
    // 隐藏翻译控件
    document.getElementById('translationControls').style.display = 'none';
}

// 显示高亮详情
function showHighlightDetail(index) {
    if (!currentAnalysis || !currentAnalysis.contract_optimization) return;
    
    const modifications = currentAnalysis.contract_optimization.modifications;
    if (index >= modifications.length) return;
    
    const mod = modifications[index];
    const modal = document.getElementById('highlightDetailModal');
    const content = document.getElementById('highlightDetailContent');
    
    if (!modal || !content) return;
    
    // 构建详情内容
    let detailHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary">修改类型</h6>
                <p class="badge bg-${getModificationTypeColor(mod.type)}">${getModificationTypeText(mod.type)}</p>
                
                <h6 class="text-primary mt-3">修改位置</h6>
                <p>${mod.position || '未指定'}</p>
                
                <h6 class="text-primary mt-3">原文内容</h6>
                <div class="bg-light p-2 rounded">
                    <pre class="mb-0">${mod.original_text || '新增内容（无原文）'}</pre>
                </div>
            </div>
            <div class="col-md-6">
                <h6 class="text-primary">优化后内容</h6>
                <div class="bg-light p-2 rounded">
                    <pre class="mb-0">${mod.optimized_text || '未提供'}</pre>
                </div>
                
                <h6 class="text-primary mt-3">修改原因</h6>
                <p>${mod.reason || '未提供'}</p>
                
                <h6 class="text-primary mt-3">相关法律条款</h6>
                <p class="text-info">${mod.related_article || '未提供'}</p>
            </div>
        </div>
    `;
    
    content.innerHTML = detailHtml;
    
    // 显示模态框
    const bootstrapModal = new bootstrap.Modal(modal);
    bootstrapModal.show();
}

// 获取修改类型颜色
function getModificationTypeColor(type) {
    switch (type) {
        case 'add': return 'success';
        case 'modify': return 'warning';
        case 'delete': return 'danger';
        default: return 'secondary';
    }
}

// 获取修改类型文本
function getModificationTypeText(type) {
    switch (type) {
        case 'add': return '新增';
        case 'modify': return '修改';
        case 'delete': return '删除';
        default: return type;
    }
}

// 切换法律内容展开/收起
function toggleLawContent(button) {
    const lawContent = button.previousElementSibling;
    const icon = button.querySelector('i');
    
    if (lawContent.style.maxHeight === 'none' || !lawContent.style.maxHeight) {
        lawContent.style.maxHeight = '60px';
        button.innerHTML = '<i class="fas fa-chevron-down"></i> 展开';
        button.classList.remove('expanded');
    } else {
        lawContent.style.maxHeight = 'none';
        button.innerHTML = '<i class="fas fa-chevron-up"></i> 收起';
        button.classList.add('expanded');
    }
}

// 高亮模式切换
function toggleHighlightMode() {
    const originalText = document.getElementById('originalTextContent');
    const modifiedText = document.getElementById('modifiedTextContent');
    
    if (originalText.classList.contains('highlight-mode')) {
        // 关闭高亮模式
        originalText.classList.remove('highlight-mode');
        modifiedText.classList.remove('highlight-mode');
        showMessage('高亮模式已关闭', 'info');
    } else {
        // 开启高亮模式
        originalText.classList.add('highlight-mode');
        modifiedText.classList.add('highlight-mode');
        applyHighlights();
        showMessage('高亮模式已开启', 'success');
    }
}

// 应用高亮
function applyHighlights() {
    const originalText = document.getElementById('originalTextContent');
    const modifiedText = document.getElementById('modifiedTextContent');
    
    // 清空之前的高亮
    originalText.innerHTML = originalText.innerHTML.replace(/<span class="highlight-[^"]*">([^<]*)<\/span>/g, '$1');
    modifiedText.innerHTML = modifiedText.innerHTML.replace(/<span class="highlight-[^"]*">([^<]*)<\/span>/g, '$1');
    
    // 获取修改建议
    let modifications = [];
    if (currentAnalysis && currentAnalysis.analysis.contract_optimization) {
        modifications = currentAnalysis.analysis.contract_optimization.modifications;
    } else if (Object.keys(translatedContent).length > 0 && currentLanguage !== 'zh') {
        // 如果是翻译后的内容，使用翻译的修改建议
        const currentTranslatedContent = translatedContent[currentLanguage];
        if (currentTranslatedContent && currentTranslatedContent.modifications) {
            modifications = currentTranslatedContent.modifications;
        }
    }
    
    if (modifications.length === 0) return;
    
    // 应用新的高亮，添加点击事件
    modifications.forEach((mod, index) => {
        if (mod.original_text && mod.original_text.trim()) {
            const originalHighlight = `<span class="highlight-${mod.highlight_type || 'modify'}" onclick="showHighlightDetail(${index})" title="点击查看修改详情">${mod.original_text}</span>`;
            originalText.innerHTML = originalText.innerHTML.replace(mod.original_text, originalHighlight);
        }
        
        if (mod.optimized_text && mod.optimized_text.trim()) {
            const modifiedHighlight = `<span class="highlight-${mod.highlight_type || 'modify'}" onclick="showHighlightDetail(${index})" title="点击查看修改详情">${mod.optimized_text}</span>`;
            modifiedText.innerHTML = modifiedText.innerHTML.replace(mod.optimized_text, modifiedHighlight);
        }
    });
}

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
    const fileInput = document.getElementById('fileInput');
    const primaryLaw = document.getElementById('primaryLaw').value;
    const secondaryLaw = document.getElementById('secondaryLaw').value;
    
    if (!fileInput.files[0]) {
        showMessage('请选择要分析的合同文件', 'warning');
        return;
    }
    
    if (!primaryLaw) {
        showMessage('请选择主要法律体系', 'warning');
        return;
    }
    
    try {
        // 显示进度区域
        showProgressSection();
        
        // 重置进度
        updateProgress(0, '准备开始分析...');
        
        // 准备文件数据
        const formData = new FormData();
        formData.append('contract', fileInput.files[0]);
        formData.append('primaryLaw', primaryLaw);
        if (secondaryLaw) {
            formData.append('secondaryLaw', secondaryLaw);
        }
        
        // 开始分析
        updateProgress(10, '正在上传合同文件...');
        
        const response = await fetch('/api/analyze', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // 开始流式读取响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        updateProgress(20, '开始AI分析流程...');
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // 尝试解析进度更新
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一行（可能不完整）
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        if (data.type === 'progress') {
                            updateProgress(data.progress, data.message);
                        } else if (data.type === 'step_result') {
                            // 显示步骤结果
                            displayStepResult(data.step, data.result);
                        } else if (data.type === 'complete') {
                            // 分析完成
                            updateProgress(100, '分析完成！');
                            setTimeout(() => {
                                hideProgressSection();
                                displayResults(data.result);
                            }, 1000);
                            return;
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('分析错误:', error);
        showMessage(`分析失败: ${error.message}`, 'danger');
        hideProgressSection();
    }
}

// 显示步骤结果
function displayStepResult(step, result) {
    const stepResultsContainer = document.getElementById('stepResults');
    if (!stepResultsContainer) return;
    
    const stepName = getStepDisplayName(step);
    const stepIcon = getStepIcon(step);
    
    let resultHtml = '';
    
    switch (step) {
        case 'legal_analysis':
            resultHtml = `
                <div class="step-result legal-analysis">
                    <h6><i class="${stepIcon}"></i> ${stepName}完成</h6>
                    <div class="step-content">
                        <div class="compliance-score">
                            <span class="score-label">合规评分：</span>
                            <span class="score-value ${getScoreClass(result.compliance_score)}">${result.compliance_score}</span>
                        </div>
                        <div class="risk-summary">
                            <span class="risk-label">风险等级：</span>
                            <span class="risk-value ${getRiskClass(result.risk_level)}">${result.risk_level}</span>
                        </div>
                        <div class="summary-text">
                            <strong>分析摘要：</strong>${result.analysis_summary || '暂无摘要'}
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'optimization':
            resultHtml = `
                <div class="step-result optimization">
                    <h6><i class="${stepIcon}"></i> ${stepName}完成</h6>
                    <div class="step-content">
                        <div class="modification-summary">
                            <span class="mod-label">修改建议：</span>
                            <span class="mod-value">${result.modifications?.length || 0}个</span>
                        </div>
                        <div class="summary-text">
                            <strong>优化总结：</strong>${result.summary || '暂无总结'}
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'translation':
            resultHtml = `
                <div class="step-result translation">
                    <h6><i class="${stepIcon}"></i> ${stepName}完成</h6>
                    <div class="step-content">
                        <div class="translation-info">
                            <span class="lang-label">目标语言：</span>
                            <span class="lang-value">${getLanguageName(result.target_language)}</span>
                        </div>
                        <div class="summary-text">
                            <strong>翻译完成：</strong>合同已成功翻译为${getLanguageName(result.target_language)}
                        </div>
                    </div>
                </div>
            `;
            break;
    }
    
    // 添加到步骤结果容器
    const stepResultDiv = document.createElement('div');
    stepResultDiv.innerHTML = resultHtml;
    stepResultDiv.className = 'step-result-item';
    
    // 添加动画效果
    stepResultDiv.style.opacity = '0';
    stepResultDiv.style.transform = 'translateY(20px)';
    
    stepResultsContainer.appendChild(stepResultDiv);
    
    // 触发动画
    setTimeout(() => {
        stepResultDiv.style.transition = 'all 0.5s ease';
        stepResultDiv.style.opacity = '1';
        stepResultDiv.style.transform = 'translateY(0)';
    }, 100);
}

// 获取步骤图标
function getStepIcon(step) {
    const icons = {
        'legal_analysis': 'fas fa-gavel',
        'optimization': 'fas fa-edit',
        'translation': 'fas fa-language'
    };
    return icons[step] || 'fas fa-check-circle';
}

// 获取分数样式类
function getScoreClass(score) {
    if (score >= 90) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
}

// 获取风险等级样式类
function getRiskClass(riskLevel) {
    if (riskLevel.includes('高')) return 'risk-high';
    if (riskLevel.includes('中')) return 'risk-medium';
    return 'risk-low';
}

// 显示进度区域
function showProgressSection() {
    const progressSection = document.getElementById('progressSection');
    const uploadSection = document.getElementById('uploadSection');
    
    if (progressSection) {
        progressSection.style.display = 'block';
        updateProgress(0, '准备开始分析...');
    }
    
    if (uploadSection) {
        uploadSection.style.display = 'none';
    }
}

// 隐藏进度区域
function hideProgressSection() {
    const progressSection = document.getElementById('progressSection');
    if (progressSection) {
        progressSection.style.display = 'none';
    }
}

// 更新进度
function updateProgress(step, message) {
    analysisProgress.step = step;
    analysisProgress.currentStep = message;
    
    const progressBar = document.getElementById('analysisProgressBar');
    const progressText = document.getElementById('progressText');
    const stepIndicator = document.getElementById('stepIndicator');
    
    if (progressBar) {
        const progress = (step / analysisProgress.totalSteps) * 100;
        progressBar.style.width = progress + '%';
        progressBar.setAttribute('aria-valuenow', progress);
    }
    
    if (progressText) {
        progressText.textContent = message;
    }
    
    if (stepIndicator) {
        let stepText = '';
        switch (step) {
            case 1:
                stepText = '第一步：法律合规分析';
                break;
            case 2:
                stepText = '第二步：合同优化修改';
                break;
            case 3:
                stepText = '第三步：合同翻译';
                break;
            default:
                stepText = '准备中...';
        }
        stepIndicator.textContent = stepText;
    }
    
    console.log(`分析进度: ${step}/${analysisProgress.totalSteps} - ${message}`);
}

// 显示分析结果
function displayResults(result) {
    console.log('开始显示分析结果:', result);
    
    // 更新合规分数
    document.getElementById('complianceScore').textContent = result.compliance_score;
    
    // 更新分数描述
    let scoreDescription = '';
    if (result.compliance_score >= 90) {
        scoreDescription = '优秀 - 合同基本符合法律要求';
    } else if (result.compliance_score >= 70) {
        scoreDescription = '良好 - 建议完善部分条款';
    } else if (result.compliance_score >= 50) {
        scoreDescription = '一般 - 需要重点关注风险因素';
    } else {
        scoreDescription = '较差 - 建议咨询专业律师';
    }
    document.getElementById('scoreDescription').textContent = scoreDescription;
    
    // 显示分析摘要
    if (result.analysis_summary) {
        document.getElementById('analysisSummary').textContent = result.analysis_summary;
    }
    
    // 显示分析状态和重试选项
    displayAnalysisStatus(result);
    
    // 显示相关条例
    displayRegulations(result.matched_articles);
    
    // 显示法条原文对照
    displayRegulationsComparison(result.matched_articles);
    
    // 显示风险因素
    displayRiskFactors(result.risk_factors);
    
    // 显示改进建议
    displaySuggestions(result.suggestions);
    
    // 显示优化概览
    displayOptimizationOverview(result);
    
    // 显示对比面板 - 传递正确的原文内容
    const originalText = result.content || result.contract_text || '';
    displayComparisonPanels(originalText, result);
    
    // 显示结果区域
    document.getElementById('resultSection').style.display = 'block';
    
    // 隐藏进度区域
    document.getElementById('progressSection').style.display = 'none';
    
    // 隐藏上传界面，让用户专注于分析结果
    document.getElementById('uploadSection').style.display = 'none';
    
    // 刷新历史记录和统计
    loadHistory();
    loadStatistics();
}

// 显示分析状态和重试选项
function displayAnalysisStatus(result) {
    const statusContainer = document.getElementById('analysisStatus');
    if (!statusContainer) return;
    
    if (result.analysis_status) {
        const status = result.analysis_status;
        let statusHtml = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle"></i> 分析状态</h6>
                <p>已完成步骤: ${status.completed_steps}/${status.total_steps}</p>
                <p>失败步骤: ${status.failed_steps}</p>
        `;
        
        if (status.can_retry && status.can_retry.length > 0) {
            statusHtml += `
                <div class="mt-2">
                    <p class="text-warning"><i class="fas fa-exclamation-triangle"></i> 以下步骤可以重试:</p>
                    <div class="d-flex gap-2 flex-wrap">
            `;
            
            status.can_retry.forEach(step => {
                const stepName = getStepDisplayName(step);
                statusHtml += `
                    <button class="btn btn-sm btn-warning" onclick="retryAnalysisStep('${step}')">
                        <i class="fas fa-redo"></i> 重试${stepName}
                    </button>
                `;
            });
            
            statusHtml += `
                    </div>
                </div>
            `;
        }
        
        statusHtml += '</div>';
        statusContainer.innerHTML = statusHtml;
        statusContainer.style.display = 'block';
    } else {
        statusContainer.style.display = 'none';
    }
}

// 获取步骤显示名称
function getStepDisplayName(step) {
    const stepNames = {
        'legal_analysis': '法律分析',
        'optimization': '合同优化',
        'translation': '合同翻译'
    };
    return stepNames[step] || step;
}

// 重试分析步骤
async function retryAnalysisStep(stepName) {
    if (!currentAnalysis || !currentAnalysis.id) {
        showMessage('无法重试：缺少合同ID', 'warning');
        return;
    }
    
    try {
        showMessage(`正在重试${getStepDisplayName(stepName)}...`, 'info');
        
        const response = await fetch('/api/retry-step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stepName: stepName,
                contractId: currentAnalysis.id,
                primaryLaw: currentAnalysis.primary_law || 'china',
                secondaryLaw: currentAnalysis.secondary_law || null
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showMessage(`${getStepDisplayName(stepName)}重试成功！`, 'success');
            
            // 更新当前分析结果
            updateAnalysisResult(stepName, result.result);
            
            // 重新显示结果
            displayResults(currentAnalysis);
        } else {
            throw new Error(result.error || '重试失败');
        }
        
    } catch (error) {
        console.error('重试步骤失败:', error);
        showMessage(`重试失败: ${error.message}`, 'danger');
    }
}

// 更新分析结果
function updateAnalysisResult(stepName, result) {
    if (!currentAnalysis) return;
    
    switch (stepName) {
        case 'legal_analysis':
            currentAnalysis.compliance_score = result.compliance_score;
            currentAnalysis.risk_level = result.risk_level;
            currentAnalysis.risk_factors = result.risk_factors;
            currentAnalysis.suggestions = result.suggestions;
            currentAnalysis.matched_articles = result.matched_articles;
            currentAnalysis.analysis_summary = result.analysis_summary;
            break;
        
        case 'optimization':
            currentAnalysis.contract_optimization = result;
            break;
        
        case 'translation':
            currentAnalysis.translation = result;
            break;
    }
    
    // 更新分析状态
    if (currentAnalysis.analysis_status) {
        currentAnalysis.analysis_status.completed_steps++;
        currentAnalysis.analysis_status.failed_steps--;
        const retryIndex = currentAnalysis.analysis_status.can_retry.indexOf(stepName);
        if (retryIndex > -1) {
            currentAnalysis.analysis_status.can_retry.splice(retryIndex, 1);
        }
    }
}

// 自动生成并显示修改建议
async function generateAndDisplayModifications(originalText, analysis) {
    try {
        // 显示加载状态提示
        showMessage('AI正在处理合同优化建议...', 'info');
        
        // 检查分析结果中是否已经包含合同优化信息
        if (analysis.contract_optimization && analysis.contract_optimization.optimized_text) {
            // 直接使用分析结果中的优化信息
            const result = {
                modified_text: analysis.contract_optimization.optimized_text,
                modifications: analysis.contract_optimization.modifications || [],
                summary: analysis.contract_optimization.summary || "AI优化建议"
            };
            
            // 显示AI修改建议
            displayModificationResult(result, originalText);
            showMessage('AI合同优化完成！', 'success');
        } else {
            // 如果没有优化信息，尝试调用API获取
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
                console.warn('AI返回的优化建议与原文相同');
                showMessage('AI未提供有效的修改建议，请检查合同内容或重试', 'warning');
                return;
            } else {
                // 显示AI修改建议
                displayModificationResult(result, originalText);
            }
            
            showMessage('AI合同优化完成！', 'success');
        }
        
    } catch (error) {
        console.error('生成AI优化建议失败:', error);
        showMessage(`生成AI优化建议失败: ${error.message}`, 'danger');
        
        // 如果AI生成失败，显示错误信息
        showMessage('AI生成修改建议失败，请检查网络连接或API配置', 'danger');
        return;
    }
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

// 这些函数已不再需要，因为优化后的合同现在直接显示在修改后合同面板中

// 显示优化概览
function displayOptimizationOverview(analysis) {
    // 更新概览卡片
    document.getElementById('optimizationScore').textContent = analysis.compliance_score;
    
    // 设置合规等级
    let optimizationLevel = '';
    if (analysis.compliance_score >= 90) {
        optimizationLevel = '优秀';
    } else if (analysis.compliance_score >= 70) {
        optimizationLevel = '良好';
    } else if (analysis.compliance_score >= 50) {
        optimizationLevel = '一般';
    } else {
        optimizationLevel = '较差';
    }
    document.getElementById('optimizationLevel').textContent = optimizationLevel;
    
    // 设置风险等级
    let riskLevel = '-';
    if (analysis.risk_factors && analysis.risk_factors.length > 0) {
        // 根据风险因素数量判断风险等级
        if (analysis.risk_factors.length >= 5) {
            riskLevel = '高风险';
        } else if (analysis.risk_factors.length >= 3) {
            riskLevel = '中风险';
        } else {
            riskLevel = '低风险';
        }
    }
    document.getElementById('riskLevel').textContent = riskLevel;
    document.getElementById('riskCount').textContent = `${analysis.risk_factors?.length || 0}个风险`;
    
    // 设置修改建议数量
    const modificationCount = analysis.contract_optimization?.modifications?.length || 0;
    document.getElementById('modificationCount').textContent = modificationCount;
    
    // 设置法条数量
    const lawCount = analysis.matched_articles?.length || 0;
    document.getElementById('lawCount').textContent = lawCount;
}

// 显示并排对比面板
function displayComparisonPanels(originalText, analysis) {
    console.log('显示对比面板:', { originalText: originalText?.length, analysis });
    
    // 第一组三列：原文、修改文、法律依据
    displayFirstThreeColumns(originalText, analysis);
    
    // 第二组三列：翻译原文、翻译修改文、翻译法律依据
    displaySecondThreeColumns(analysis);
}

// 显示第一组三列：原文、修改文、法律依据
function displayFirstThreeColumns(originalText, analysis) {
    // 显示原文（用户上传的原始合同）
    displayOriginalText(originalText, analysis);
    
    // 显示修改后的合同（AI优化后的合同）
    displayModifiedText(analysis);
    
    // 显示法律依据和修正建议
    displayLegalBasisAndSuggestions(analysis);
}

// 显示第二组三列：翻译原文、翻译修改文、翻译法律依据
function displaySecondThreeColumns(analysis) {
    // 显示翻译的原文
    displayTranslatedOriginal(analysis);
    
    // 显示翻译的修改文
    displayTranslatedModified(analysis);
    
    // 显示翻译的法律依据
    displayTranslatedLegalBasis(analysis);
}

// 显示原文（用户上传的原始合同）
function displayOriginalText(originalText, analysis) {
    const originalTextContent = document.getElementById('originalTextContent');
    if (originalTextContent) {
        // 如果没有原文，显示提示信息
        if (!originalText || originalText.trim() === '') {
            originalTextContent.innerHTML = '<p class="text-muted">暂无原文内容</p>';
            console.log('原文内容为空');
            return;
        }
        
        // 创建带有高亮的原文
        let highlightedText = originalText;
        
        // 如果有修改建议，在原文中标记位置
        if (analysis.contract_optimization?.modifications && analysis.contract_optimization.modifications.length > 0) {
            console.log('开始处理高亮，修改建议数量:', analysis.contract_optimization.modifications.length);
            
            // 按照位置从后往前排序，避免替换时的位置偏移
            const sortedModifications = [...analysis.contract_optimization.modifications]
                .sort((a, b) => (b.highlight_start || 0) - (a.highlight_start || 0));
            
            sortedModifications.forEach((mod, index) => {
                if (mod.original_text && mod.original_text.trim()) {
                    try {
                        const marker = `<span class="highlight-${mod.highlight_type || 'modify'}" onclick="showHighlightDetail(${index})" title="点击查看修改详情">${escapeHtml(mod.original_text)}</span>`;
                        // 使用全局替换，确保所有匹配项都被替换
                        const regex = new RegExp(escapeHtml(mod.original_text), 'g');
                        highlightedText = highlightedText.replace(regex, marker);
                        console.log(`高亮处理完成: ${index + 1}/${sortedModifications.length}`);
                    } catch (error) {
                        console.error(`高亮处理失败 (${index + 1}):`, error);
                        // 如果高亮失败，继续处理其他修改
                    }
                }
            });
        }
        
        // 安全地设置HTML内容
        try {
            originalTextContent.innerHTML = highlightedText.replace(/\n/g, '<br>');
            console.log('原文显示完成，长度:', originalText.length);
        } catch (error) {
            console.error('设置HTML内容失败:', error);
            // 如果设置HTML失败，使用纯文本
            originalTextContent.textContent = originalText;
        }
        
        if (analysis.contract_optimization?.modifications) {
            console.log('修改建议数量:', analysis.contract_optimization.modifications.length);
        }
    }
}

// 显示修改后的合同（AI优化后的合同）
function displayModifiedText(analysis) {
    const modifiedTextContent = document.getElementById('modifiedTextContent');
    if (!modifiedTextContent) return;
    
    const optimizedText = analysis.contract_optimization?.optimized_text || '暂无优化后的合同';
    modifiedTextContent.innerHTML = optimizedText.replace(/\n/g, '<br>');
    
    console.log('修改后合同显示完成');
}

// 显示法律依据和修正建议
function displayLegalBasisAndSuggestions(analysis) {
    const legalBasisContent = document.getElementById('legalBasisContent');
    if (!legalBasisContent) return;
    
    let html = '';
    
    // 显示相关条例
    if (analysis.matched_articles && analysis.matched_articles.length > 0) {
        html += '<div class="legal-section mb-3">';
        html += '<h6><i class="fas fa-gavel"></i> 涉及相关条例</h6>';
        html += '<div class="legal-articles">';
        analysis.matched_articles.forEach(article => {
            html += `<div class="legal-article">${article}</div>`;
        });
        html += '</div></div>';
    }
    
    // 显示修改建议和法律依据
    if (analysis.contract_optimization?.modifications && analysis.contract_optimization.modifications.length > 0) {
        html += '<div class="modifications-section">';
        html += '<h6><i class="fas fa-edit"></i> 修改建议及法律依据</h6>';
        analysis.contract_optimization.modifications.forEach((mod, index) => {
            html += `
                <div class="modification-item" onclick="showModificationDetail(${index})">
                    <div class="mod-header">
                        <span class="mod-number">${index + 1}</span>
                        <span class="mod-type">${getModificationType(mod.highlight_type)}</span>
                    </div>
                    <div class="mod-content">
                        <div class="mod-original"><strong>原文：</strong>${mod.original_text}</div>
                        <div class="mod-modified"><strong>修改后：</strong>${mod.modified_text}</div>
                        <div class="mod-legal-basis"><strong>法律依据：</strong>${mod.legal_basis}</div>
                        <div class="mod-reason"><strong>修改原因：</strong>${mod.reason}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    legalBasisContent.innerHTML = html;
}

// 显示翻译的原文
async function displayTranslatedOriginal(analysis) {
    const translatedOriginalContent = document.getElementById('translatedOriginalContent');
    if (!translatedOriginalContent) return;
    
    const originalText = analysis.content || analysis.contract_text || '';
    if (!originalText || originalText.trim() === '') {
        translatedOriginalContent.innerHTML = '<p class="text-muted">暂无原文内容</p>';
        return;
    }
    
    // 显示加载状态
    translatedOriginalContent.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> 正在翻译原文...</div>';
    
    try {
        // 调用AI翻译原文
        const response = await fetch('/api/translate-original', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                original_text: originalText,
                target_language: 'en',
                primary_law: analysis.primary_law || 'china',
                secondary_law: analysis.secondary_law || null
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.translated_text) {
            translatedOriginalContent.innerHTML = result.translated_text.replace(/\n/g, '<br>');
            console.log('原文翻译完成');
        } else {
            throw new Error(result.error || '翻译失败');
        }
        
    } catch (error) {
        console.error('翻译原文失败:', error);
        translatedOriginalContent.innerHTML = `
            <div class="text-danger">
                <i class="fas fa-exclamation-triangle"></i> 翻译失败: ${error.message}
                <br><small>原文内容:</small>
                <div class="mt-2 p-2 bg-light border rounded">
                    ${originalText.substring(0, 200)}${originalText.length > 200 ? '...' : ''}
                </div>
            </div>
        `;
    }
}

// 显示翻译的修改文
function displayTranslatedModified(analysis) {
    const translatedModifiedContent = document.getElementById('translatedModifiedContent');
    if (!translatedModifiedContent) return;
    
    const translatedText = analysis.translation?.translated_text || '暂无翻译版本';
    translatedModifiedContent.innerHTML = translatedText.replace(/\n/g, '<br>');
}

// 显示翻译的法律依据
function displayTranslatedLegalBasis(analysis) {
    const translatedLegalBasisContent = document.getElementById('translatedLegalBasisContent');
    if (!translatedLegalBasisContent) return;
    
    let html = '';
    
    // 显示翻译后的修改建议和法律依据
    if (analysis.translation?.translated_modifications && analysis.translation.translated_modifications.length > 0) {
        html += '<div class="translated-modifications-section">';
        html += '<h6><i class="fas fa-language"></i> 翻译后的修改建议及法律依据</h6>';
        analysis.translation.translated_modifications.forEach((mod, index) => {
            html += `
                <div class="translated-modification-item">
                    <div class="mod-header">
                        <span class="mod-number">${index + 1}</span>
                        <span class="mod-type">翻译版本</span>
                    </div>
                    <div class="mod-content">
                        <div class="mod-original"><strong>原文：</strong>${mod.original_text || 'N/A'}</div>
                        <div class="mod-translated"><strong>翻译后：</strong>${mod.translated_text || 'N/A'}</div>
                        <div class="mod-legal-basis"><strong>法律依据：</strong>${mod.legal_basis || 'N/A'}</div>
                        <div class="mod-reason"><strong>修改原因：</strong>${mod.reason || 'N/A'}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }
    
    translatedLegalBasisContent.innerHTML = html;
}

// 获取修改类型显示名称
function getModificationType(type) {
    const types = {
        'add': '新增',
        'modify': '修改',
        'delete': '删除',
        'warning': '警告',
        'success': '成功',
        'info': '信息'
    };
    return types[type] || '修改';
}

// 显示修改详情
function showModificationDetail(index) {
    if (!currentAnalysis?.contract_optimization?.modifications) return;
    
    const mod = currentAnalysis.contract_optimization.modifications[index];
    if (!mod) return;
    
    const modal = document.getElementById('highlightDetailModal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalBody = modal.querySelector('.modal-body');
    
    modalTitle.innerHTML = `<i class="fas fa-edit"></i> 修改建议详情 (${index + 1})`;
    
    modalBody.innerHTML = `
        <div class="modification-detail">
            <div class="detail-section">
                <h6><i class="fas fa-file-alt"></i> 原文内容</h6>
                <div class="content-box original-content">${mod.original_text}</div>
            </div>
            <div class="detail-section">
                <h6><i class="fas fa-edit"></i> 修改后内容</h6>
                <div class="content-box modified-content">${mod.modified_text}</div>
            </div>
            <div class="detail-section">
                <h6><i class="fas fa-gavel"></i> 法律依据</h6>
                <div class="content-box legal-basis">${mod.legal_basis}</div>
            </div>
            <div class="detail-section">
                <h6><i class="fas fa-info-circle"></i> 修改原因</h6>
                <div class="content-box reason">${mod.reason}</div>
            </div>
        </div>
    `;
    
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

// 切换高亮模式
function toggleHighlightMode() {
    const container = document.getElementById('originalTextContainer');
    container.classList.toggle('highlight-mode');
}

// 切换法律详情（已集成到高亮功能中）
function toggleLawDetails() {
    // 法律详情已集成到高亮功能中，用户可以通过点击高亮查看详情
    console.log('法律详情已集成到高亮功能中');
}

// 应用所有修改
function applyAllModifications() {
    if (currentAnalysis && currentAnalysis.analysis.contract_optimization) {
        const optimizedText = currentAnalysis.analysis.contract_optimization.optimized_text;
        const textarea = document.getElementById('originalContractText');
        if (textarea && optimizedText) {
            textarea.value = optimizedText;
            showMessage('已应用所有修改建议', 'success');
        }
    }
}

// 下载修改后的合同文件
function downloadOptimizedContract() {
    // 检查是否有翻译内容
    if (Object.keys(translatedContent).length > 0) {
        // 提供多语言下载选项
        showMultiLanguageDownloadOptions();
        return;
    }
    
    // 优先从修改后合同面板获取内容
    const modifiedTextContent = document.getElementById('modifiedTextContent');
    if (modifiedTextContent && modifiedTextContent.textContent.trim()) {
        const optimizedText = modifiedTextContent.textContent;
        downloadTextFile(optimizedText, '优化后合同.txt');
        return;
    }
    
    // 如果面板中没有内容，尝试从分析结果获取
    if (currentAnalysis && currentAnalysis.analysis.contract_optimization) {
        const optimizedText = currentAnalysis.analysis.contract_optimization.optimized_text;
        if (optimizedText) {
            downloadTextFile(optimizedText, '优化后合同.txt');
            return;
        }
    }
    
    showMessage('没有可下载的优化后合同！', 'warning');
}

// 显示多语言下载选项
function showMultiLanguageDownloadOptions() {
    const languages = Object.keys(translatedContent);
    const currentDate = new Date().toISOString().split('T')[0];
    
    // 创建下载选项
    let downloadOptions = `
        <div class="alert alert-info">
            <h6><i class="fas fa-download"></i> 选择下载语言版本：</h6>
            <p class="text-muted mb-2">此合同已确保同时符合${getLawDisplayName(selectedPrimaryLaw)}${selectedSecondaryLaw ? `和${getLawDisplayName(selectedSecondaryLaw)}` : ''}的法律要求</p>
            <div class="row mt-2">
                <div class="col-md-6">
                    <button class="btn btn-primary btn-sm w-100 mb-2" onclick="downloadContractInLanguage('zh', '${currentDate}')">
                        <i class="fas fa-flag"></i> 中文版本
                    </button>
                </div>
    `;
    
    languages.forEach(lang => {
        const langName = getLanguageDisplayName(lang);
        downloadOptions += `
            <div class="col-md-6">
                <button class="btn btn-success btn-sm w-100 mb-2" onclick="downloadContractInLanguage('${lang}', '${currentDate}')">
                    <i class="fas fa-language"></i> ${langName}
                </button>
            </div>
        `;
    });
    
    downloadOptions += `
            </div>
            <div class="row mt-2">
                <div class="col-12">
                    <button class="btn btn-info btn-sm w-100" onclick="downloadAllLanguages('${currentDate}')">
                        <i class="fas fa-download"></i> 下载所有语言版本
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 显示下载选项
    showMessage(downloadOptions, 'info', true);
}

// 获取语言显示名称
function getLanguageDisplayName(langCode) {
    const languageNames = {
        'en': '英语版本',
        'ja': '日语版本',
        'ko': '韩语版本',
        'de': '德语版本',
        'fr': '法语版本',
        'es': '西班牙语版本',
        'ru': '俄语版本'
    };
    return languageNames[langCode] || langCode;
}

// 下载指定语言的合同
function downloadContractInLanguage(language, date) {
    let content = '';
    let filename = '';
    
    if (language === 'zh') {
        // 中文版本
        const modifiedTextContent = document.getElementById('modifiedTextContent');
        content = modifiedTextContent ? modifiedTextContent.textContent : '';
        filename = `优化后合同_中文_${date}.txt`;
    } else {
        // 其他语言版本
        const translatedData = translatedContent[language];
        if (translatedData && translatedData.modifiedText) {
            content = translatedData.modifiedText;
            const langName = getLanguageDisplayName(language);
            filename = `优化后合同_${langName}_${date}.txt`;
        }
    }
    
    if (content) {
        downloadTextFile(content, filename);
    } else {
        showMessage('该语言版本内容不存在！', 'warning');
    }
}

// 下载翻译版本
function downloadTranslatedContract() {
    if (!window.currentTranslation || !window.currentTranslation.translated_text) {
        showMessage('没有可下载的翻译版本！', 'warning');
        return;
    }
    
    const content = window.currentTranslation.translated_text;
    const targetLang = window.currentTranslation.target_language;
    const langName = getLanguageDisplayName(targetLang);
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `翻译后合同_${langName}_${currentDate}.txt`;
    
    downloadTextFile(content, filename);
}

// 下载所有语言版本
function downloadAllLanguages(date) {
    const languages = ['zh', ...Object.keys(translatedContent)];
    
    languages.forEach((lang, index) => {
        setTimeout(() => {
            downloadContractInLanguage(lang, date);
        }, index * 500); // 延迟500ms避免浏览器阻止多个下载
    });
    
    showMessage('正在下载所有语言版本...', 'info');
}

// 下载文本文件的通用函数
function downloadTextFile(content, filename) {
    try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `优化后合同_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage('优化后合同文件下载成功！', 'success');
    } catch (error) {
        console.error('下载优化后合同失败:', error);
        showMessage('下载失败: ' + error.message, 'danger');
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
    
    const riskFactorsHtml = riskFactors.map(risk => {
        if (typeof risk === 'string') {
            return `
                <div class="alert alert-warning mb-2">
                    <i class="fas fa-exclamation-triangle"></i> ${risk}
                </div>
            `;
        } else if (risk.type && risk.description) {
            return `
                <div class="alert alert-${getRiskAlertType(risk.severity)} mb-2">
                    <strong>${risk.type}:</strong> ${risk.description}
                    <br><small class="text-muted">建议: ${risk.suggestion}</small>
                </div>
            `;
        } else {
            return `
                <div class="alert alert-warning mb-2">
                    <i class="fas fa-exclamation-triangle"></i> ${JSON.stringify(risk)}
                </div>
            `;
        }
    }).join('');
    
    riskFactorsList.innerHTML = riskFactorsHtml;
}

// 显示改进建议
function displaySuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (!suggestions || suggestions.length === 0) {
        suggestionsList.innerHTML = '<p class="text-muted">暂无具体建议</p>';
        return;
    }
    
    const suggestionsHtml = suggestions.map(suggestion => {
        if (typeof suggestion === 'string') {
            return `
                <div class="alert alert-info mb-2">
                    <i class="fas fa-lightbulb"></i> ${suggestion}
                </div>
            `;
        } else if (suggestion.suggestion && suggestion.legal_basis) {
            return `
                <div class="alert alert-info mb-2">
                    <div class="mb-2">
                        <i class="fas fa-lightbulb"></i> <strong>建议：</strong>${suggestion.suggestion}
                    </div>
                    <div class="text-muted small">
                        <i class="fas fa-gavel"></i> <strong>法律依据：</strong>${suggestion.legal_basis}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="alert alert-info mb-2">
                    <i class="fas fa-lightbulb"></i> ${JSON.stringify(suggestion)}
                </div>
            `;
        }
    }).join('');
    
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
            // 优先使用 highlight_start 和 highlight_end，如果没有则使用文本搜索
            if (mod.highlight_start !== undefined && mod.highlight_end !== undefined) {
                return mod.highlight_end - mod.highlight_start;
            }
            const aPos = text.indexOf(a.optimized_text || a.suggested_text || '');
            const bPos = text.indexOf(b.optimized_text || b.suggested_text || '');
            return bPos - aPos;
        });
        
        sortedModifications.forEach(mod => {
            // 支持新旧数据结构
            const optimizedText = mod.optimized_text || mod.suggested_text;
            const originalText = mod.original_text;
            const highlightType = mod.highlight_type || 'info';
            
            if (mod.type === 'modify' && originalText && optimizedText) {
                // 高亮修改的部分
                const highlightedMod = `<span class="highlight-${highlightType}" title="原文：${escapeHtml(originalText)}">${escapeHtml(optimizedText)}</span>`;
                highlightedText = highlightedText.replace(optimizedText, highlightedMod);
            } else if (mod.type === 'add' && optimizedText) {
                // 高亮新增的部分
                const highlightedAdd = `<span class="highlight-${highlightType}" title="新增条款">${escapeHtml(optimizedText)}</span>`;
                highlightedText = highlightedText.replace(optimizedText, highlightedAdd);
            } else if (mod.type === 'delete' && originalText) {
                // 高亮删除的部分（如果还在文本中）
                const highlightedDelete = `<span class="highlight-${highlightType}" title="已删除">${escapeHtml(originalText)}</span>`;
                highlightedText = highlightedText.replace(originalText, highlightedDelete);
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

// 正则表达式转义
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                            ${(mod.optimized_text || mod.suggested_text) ? `
                                <div class="text-suggested">
                                    <strong>优化内容:</strong><br>
                                    <div class="highlight-success p-2 rounded">${escapeHtml(mod.optimized_text || mod.suggested_text)}</div>
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

// 加载历史记录（简化版，只显示最近5条）
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
            historyList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无分析历史</h5>
                    <p class="text-muted">开始您的第一次合同分析吧！</p>
                </div>
            `;
            return;
        }
        
        // 只显示最近5条记录
        const recentHistory = history.slice(0, 5);
        let historyHtml = recentHistory.map(item => {
            // 从新的SQL结构获取数据
            const contract = item;
            const analysis = item.analysis_results;
            const complianceScore = analysis?.compliance_score || 0;
            const riskLevel = analysis?.risk_level || 'unknown';
            const primaryLaw = contract.primary_law || 'china';
            const secondaryLaw = contract.secondary_law;
            const hasTranslation = analysis?.translation && Object.keys(analysis.translation).length > 0;
            const modificationCount = analysis?.modifications ? analysis.modifications.length : 0;
            
            const scoreClass = getScoreBadgeColor(complianceScore);
            const riskClass = getRiskBadgeColor(riskLevel);
            
            return `
                <div class="history-item" onclick="viewHistoryDetail('${contract.id}')" style="cursor: pointer; padding: 20px; border: 1px solid #dee2e6; border-radius: 10px; margin-bottom: 15px; transition: all 0.3s ease; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <h6 class="mb-2 text-primary">${contract.original_name || '未知文件'}</h6>
                            <div class="d-flex align-items-center mb-2">
                                <i class="fas fa-balance-scale text-muted me-2"></i>
                                <small class="text-muted">
                                    法律体系: ${getLawDisplayName(primaryLaw)}${secondaryLaw ? ` + ${getLawDisplayName(secondaryLaw)}` : ''}
                                </small>
                            </div>
                            <div class="d-flex align-items-center mb-2">
                                <i class="fas fa-clock text-muted me-2"></i>
                                <small class="text-muted">分析时间: ${new Date(contract.created_at).toLocaleString()}</small>
                            </div>
                            <div class="d-flex align-items-center">
                                <i class="fas fa-fingerprint text-info me-2"></i>
                                <small class="text-info">ID: ${contract.id.substring(0, 8)}...</small>
                            </div>
                        </div>
                        <div class="text-end ms-3">
                            <div class="badge bg-${scoreClass} fs-5 px-3 py-2 mb-2">
                                ${complianceScore}分
                            </div>
                            <div class="badge bg-${riskClass} fs-6 px-2 py-1 mb-2">
                                ${getRiskLevelText(riskLevel)}
                            </div>
                            <br>
                            <button class="btn btn-sm btn-outline-primary" onclick="viewHistoryDetail('${contract.id}', event)" title="查看详情">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteHistory('${contract.id}', event)" title="删除记录">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="row mt-3">
                        <div class="col-md-4 text-center">
                            <small class="text-muted">
                                <i class="fas fa-edit me-1"></i> ${modificationCount} 个修改建议
                            </small>
                        </div>
                        <div class="col-md-4 text-center">
                            <small class="text-muted">
                                <i class="fas fa-language me-1"></i> ${hasTranslation ? '已翻译' : '未翻译'}
                            </small>
                        </div>
                        <div class="col-md-4 text-center">
                            <small class="text-muted">
                                <i class="fas fa-hand-pointer me-1"></i> 点击查看详情
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 如果有更多记录，显示提示
        if (history.length > 5) {
            historyHtml += `
                <div class="text-center mt-3">
                    <small class="text-muted">
                        还有 ${history.length - 5} 条记录，点击上方按钮查看完整历史
                    </small>
                </div>
            `;
        }
        
        historyList.innerHTML = historyHtml;
        console.log('历史记录HTML已更新');
    } catch (error) {
        console.error('加载历史记录失败:', error);
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                加载历史记录失败: ${error.message}
                <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadHistory()">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
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
        
        // 检查新的SQL结构数据
        const analysisResult = contract.analysis_results;
        if (!analysisResult) {
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
    
    if (!contract) {
        console.error('合同数据不完整，无法显示详情');
        showMessage('合同数据不完整，无法显示详情', 'danger');
        return;
    }
    
    // 使用新的SQL结构
    const analysis = contract.analysis_results;
    if (!analysis) {
        console.error('合同缺少分析结果数据');
        showMessage('合同缺少分析结果数据', 'danger');
        return;
    }
    
    console.log('分析结果数据:', analysis);
    
    try {
        // 检查Bootstrap是否可用
        if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
            console.error('Bootstrap Modal 不可用');
            showMessage('模态框组件不可用，请刷新页面重试', 'danger');
            return;
        }
        
        const modalElement = document.getElementById('historyDetailModal');
        if (!modalElement) {
            console.error('找不到模态框元素');
            return;
        }
        
        // 清理之前的模态框实例
        const existingModal = bootstrap.Modal.getInstance(modalElement);
        if (existingModal) {
            try {
                existingModal.dispose();
            } catch (e) {
                console.warn('清理现有模态框实例时出错:', e);
            }
        }
        
        // 重置模态框状态
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
        
        // 更新弹框标题
        const titleElement = modalElement.querySelector('#historyDetailModalLabel');
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
                            <div class="mt-2">
                                <span class="badge bg-${getRiskBadgeColor(analysis.risk_level || 'unknown')} fs-6">
                                    ${getRiskLevelText(analysis.risk_level || 'unknown')}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card mb-3">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fas fa-balance-scale"></i> 法律体系</h6>
                        </div>
                        <div class="card-body">
                            <p class="mb-0">
                                <strong>主要法律：</strong>${getLawDisplayName(contract.primary_law || 'china')}<br>
                                ${contract.secondary_law ? `<strong>次要法律：</strong>${getLawDisplayName(contract.secondary_law)}` : ''}
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
                    
                    <div class="card mb-3">
                        <div class="card-header bg-secondary text-white">
                            <h6 class="mb-0"><i class="fas fa-edit"></i> 修改建议</h6>
                        </div>
                        <div class="card-body">
                            ${displayModificationsInModal(analysis.modifications || [])}
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
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-dark text-white">
                            <h6 class="mb-0"><i class="fas fa-file-alt"></i> 合同内容预览</h6>
                        </div>
                        <div class="card-body">
                            <div class="contract-preview">
                                <textarea class="form-control" rows="6" readonly>${contract.content || '暂无内容'}</textarea>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="fas fa-language"></i> 翻译信息</h6>
                        </div>
                        <div class="card-body">
                            ${displayTranslationInfoInModal(analysis.translation || {})}
                        </div>
                    </div>
                    
                    <div class="card mt-3">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="fas fa-download"></i> 下载选项</h6>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="downloadHistoryContract('${contract.id}', 'zh')">
                                    <i class="fas fa-download"></i> 下载中文版本
                                </button>
                                ${analysis.translation && analysis.translation.target_language ? 
                                    `<button class="btn btn-outline-success btn-sm" onclick="downloadHistoryContract('${contract.id}', '${analysis.translation.target_language}')">
                                        <i class="fas fa-download"></i> 下载${getLanguageDisplayName(analysis.translation.target_language)}版本
                                    </button>` : ''
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const contentElement = modalElement.querySelector('#historyDetailContent');
        if (contentElement) {
            contentElement.innerHTML = content;
        }
        
        // 创建新的模态框实例
        let modal;
        try {
            modal = new bootstrap.Modal(modalElement, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
        } catch (modalError) {
            console.error('创建模态框实例失败:', modalError);
            // 如果创建失败，尝试手动显示
            modalElement.style.display = 'block';
            modalElement.setAttribute('aria-hidden', 'false');
            modalElement.setAttribute('aria-modal', 'true');
            return;
        }
        
        // 添加模态框事件监听器
        modalElement.addEventListener('hidden.bs.modal', function() {
            // 模态框隐藏后清理焦点和状态
            try {
                // 使用安全函数清理页面状态
                safeRemoveClass(document.body, 'modal-open');
                safeSetStyle(document.body, 'overflow', '');
                safeSetStyle(document.body, 'paddingRight', '');
                
                // 安全地移除背景遮罩
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop && backdrop.parentNode) {
                    try {
                        backdrop.remove();
                    } catch (e) {
                        console.warn('移除背景遮罩时出错:', e);
                    }
                }
            } catch (e) {
                console.warn('清理模态框状态时出错:', e);
            }
        });
        
        // 为关闭按钮添加点击事件
        const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"], .btn-close');
        closeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                closeHistoryModal();
            });
        });
        
        // 显示模态框
        try {
            if (modal && typeof modal.show === 'function') {
                modal.show();
                console.log('模态框显示成功');
            } else {
                // 如果模态框实例无效，手动显示
                modalElement.style.display = 'block';
                modalElement.setAttribute('aria-hidden', 'false');
                modalElement.setAttribute('aria-modal', 'true');
                console.log('模态框手动显示成功');
            }
        } catch (showError) {
            console.error('显示模态框失败:', showError);
            // 强制手动显示
            modalElement.style.display = 'block';
            modalElement.setAttribute('aria-hidden', 'false');
            modalElement.setAttribute('aria-modal', 'true');
        }
        
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

// 在弹框中显示修改建议
function displayModificationsInModal(modifications) {
    if (!modifications || modifications.length === 0) {
        return '<p class="text-muted mb-0">暂无修改建议</p>';
    }
    
    return modifications.map((mod, index) => `
        <div class="alert alert-${getModificationAlertType(mod.type)} mb-2">
            <div class="d-flex justify-content-between align-items-start">
                <h6 class="mb-1">
                    <i class="fas fa-edit"></i> 
                    <span class="badge bg-${getBadgeColor(mod.type)}">${getModificationTypeText(mod.type)}</span>
                    ${mod.position}
                </h6>
            </div>
            <div class="mb-2">
                <strong>原文：</strong>
                <div class="bg-light p-2 rounded small">${mod.original_text || '无'}</div>
            </div>
            <div class="mb-2">
                <strong>优化后：</strong>
                <div class="bg-light p-2 rounded small">${mod.optimized_text || '无'}</div>
            </div>
            <div class="mb-2">
                <strong>法律依据：</strong>
                <div class="bg-light p-2 rounded small">${mod.related_article || '无'}</div>
            </div>
            <div>
                <strong>修改原因：</strong>
                <div class="bg-light p-2 rounded small">${mod.reason || '无'}</div>
            </div>
        </div>
    `).join('');
}

// 获取修改建议的警告类型
function getModificationAlertType(type) {
    switch (type.toLowerCase()) {
        case 'add': return 'success';
        case 'modify': return 'warning';
        case 'delete': return 'danger';
        default: return 'info';
    }
}

// 在弹框中显示翻译信息
function displayTranslationInfoInModal(translation) {
    if (!translation || !translation.target_language) {
        return '<p class="text-muted mb-0">暂无翻译版本</p>';
    }
    
    const languageName = getLanguageDisplayName(translation.target_language);
    const hasModifications = translation.translated_modifications && translation.translated_modifications.length > 0;
    
    return `
        <div class="mb-2">
            <strong>目标语言：</strong>
            <span class="badge bg-info">${languageName}</span>
        </div>
        <div class="mb-2">
            <strong>翻译状态：</strong>
            <span class="badge bg-success">已完成</span>
        </div>
        <div class="mb-2">
            <strong>修改建议翻译：</strong>
            <span class="badge bg-${hasModifications ? 'success' : 'secondary'}">${hasModifications ? '已翻译' : '未翻译'}</span>
        </div>
        ${translation.translated_at ? `
        <div class="mb-2">
            <strong>翻译时间：</strong>
            <small class="text-muted">${new Date(translation.translated_at).toLocaleString()}</small>
        </div>
        ` : ''}
    `;
}

// 获取分数描述
function getScoreDescription(score) {
    if (score >= 90) return '优秀 - 合同基本符合对外贸易法要求';
    if (score >= 70) return '良好 - 建议完善部分条款';
    if (score >= 50) return '一般 - 需要重点关注风险因素';
    return '较差 - 建议咨询专业律师';
}

// 获取风险等级徽章颜色
function getRiskBadgeColor(riskLevel) {
    switch (riskLevel.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'success';
        default: return 'secondary';
    }
}

// 获取风险等级显示文本
function getRiskLevelText(riskLevel) {
    switch (riskLevel.toLowerCase()) {
        case 'high': return '高风险';
        case 'medium': return '中风险';
        case 'low': return '低风险';
        default: return '未知';
    }
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
        analysis: contract.analysis_results,
        contract_text: contract.content
    });
    
    // 关闭弹框并清理
    closeHistoryModal();
    
    // 滚动到结果区域
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    
    showMessage('已跳转到完整分析页面', 'success');
}

// 下载历史记录中的合同
async function downloadHistoryContract(contractId, language) {
    try {
        showMessage('正在准备下载...', 'info');
        
        const response = await fetch(`/api/download/${contractId}?language=${language}`);
        if (!response.ok) {
            throw new Error(`下载失败: HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `合同_${language === 'zh' ? '中文' : getLanguageDisplayName(language)}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showMessage('下载成功！', 'success');
    } catch (error) {
        console.error('下载失败:', error);
        showMessage(`下载失败: ${error.message}`, 'danger');
    }
}

// 关闭历史详情弹框并清理
function closeHistoryModal() {
    const modalElement = document.getElementById('historyDetailModal');
    if (!modalElement) {
        console.warn('模态框元素不存在');
        return;
    }
    
    try {
        // 检查Bootstrap是否可用
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal && typeof modal.hide === 'function') {
                try {
                    modal.hide();
                } catch (hideError) {
                    console.warn('隐藏模态框失败:', hideError);
                    // 如果隐藏失败，手动隐藏
                    modalElement.style.display = 'none';
                }
            } else {
                // 如果没有找到模态框实例，手动隐藏
                modalElement.style.display = 'none';
            }
        } else {
            // Bootstrap不可用，直接手动隐藏
            modalElement.style.display = 'none';
        }
        
        // 手动清理模态框状态
        setTimeout(() => {
            try {
                // 安全地移除模态框相关的CSS类
                safeRemoveClass(document.body, 'modal-open');
                safeSetStyle(document.body, 'overflow', '');
                safeSetStyle(document.body, 'paddingRight', '');
                
                // 安全地移除背景遮罩
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop && backdrop.parentNode) {
                    backdrop.remove();
                }
                
                // 重置模态框状态
                if (modalElement) {
                    modalElement.style.display = 'none';
                    modalElement.setAttribute('aria-hidden', 'true');
                    modalElement.removeAttribute('aria-modal');
                }
                
                // 将焦点返回到触发弹框的元素
                const historyItem = document.querySelector('.history-item:focus');
                if (historyItem && historyItem.focus) {
                    historyItem.focus();
                } else {
                    // 如果没有找到触发元素，将焦点设置到页面主体
                    if (document.body && document.body.focus && typeof document.body.focus === 'function') {
                        document.body.focus();
                    }
                }
            } catch (cleanupError) {
                console.warn('清理模态框状态时出错:', cleanupError);
            }
        }, 150);
        
    } catch (error) {
        console.error('关闭模态框时出错:', error);
        // 强制清理
        try {
            if (modalElement) {
                modalElement.style.display = 'none';
                modalElement.setAttribute('aria-hidden', 'true');
                modalElement.removeAttribute('aria-modal');
            }
            safeRemoveClass(document.body, 'modal-open');
            safeSetStyle(document.body, 'overflow', '');
            safeSetStyle(document.body, 'paddingRight', '');
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop && backdrop.parentNode) {
                backdrop.remove();
            }
        } catch (forceCleanupError) {
            console.error('强制清理模态框时出错:', forceCleanupError);
        }
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

// 显示消息提示
function showMessage(message, type = 'info', isHTML = false) {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 400px; max-width: 600px;';
    
    if (isHTML) {
        messageDiv.innerHTML = message;
    } else {
        messageDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    }
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 如果是HTML内容，不自动消失
    if (!isHTML) {
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
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

// 跳转到完整历史记录页面
function viewFullHistory() {
    window.location.href = 'history.html';
}

// 下载合同文件
function downloadContract(contractId) {
    if (!contractId) {
        showMessage('合同ID无效', 'warning');
        return;
    }
    
    try {
        // 创建下载链接
        const a = document.createElement('a');
        a.href = `/api/contract/${contractId}/download`;
        a.download = `合同文件_${contractId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showMessage('合同文件下载成功！', 'success');
    } catch (error) {
        console.error('下载合同文件失败:', error);
        showMessage('下载合同文件失败', 'danger');
    }
}

// 下载分析报告
function downloadAnalysisReport() {
    if (!window.currentHistoryContract) {
        showMessage('没有可下载的分析数据', 'warning');
        return;
    }
    
    const contract = window.currentHistoryContract;
    const analysis = contract.analysis_results;
    
    // 生成报告内容
    let report = `法律合同合规AI分析报告\n\n`;
    report += `文件名: ${contract.original_name || '未知文件'}\n`;
    report += `分析时间: ${new Date(contract.created_at).toLocaleString()}\n`;
    report += `合规评分: ${analysis.compliance_score || 0}分\n`;
    report += `评分说明: ${getScoreDescription(analysis.compliance_score || 0)}\n\n`;
    
    if (analysis.analysis_summary) {
        report += `分析摘要: ${analysis.analysis_summary}\n\n`;
    }
    
    if (analysis.matched_articles && analysis.matched_articles.length > 0) {
        report += `涉及相关条例:\n`;
        analysis.matched_articles.forEach(article => {
            report += `- ${article.article}: ${article.description}\n`;
        });
        report += `\n`;
    }
    
    if (analysis.risk_factors && analysis.risk_factors.length > 0) {
        report += `风险因素:\n`;
        analysis.risk_factors.forEach(risk => {
            report += `- ${risk.type}: ${risk.description}\n`;
            report += `  建议: ${risk.suggestion}\n`;
        });
        report += `\n`;
    }
    
    if (analysis.suggestions && analysis.suggestions.length > 0) {
        report += `改进建议:\n`;
        analysis.suggestions.forEach(suggestion => {
            report += `- ${suggestion}\n`;
        });
        report += `\n`;
    }
    
    report += `合同内容:\n${contract.content || '暂无内容'}\n\n`;
    report += `---\n报告生成时间: ${new Date().toLocaleString()}\nAI分析平台: 法律合同合规AI分析系统`;
    
    // 创建下载链接
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `合同合规分析报告_${contract.original_name || '未知文件'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('分析报告下载成功！', 'success');
    
    // 下载完成后关闭弹框
    closeHistoryModal();
}

// 下载修改后的合同
function downloadModifiedText() {
    if (!currentAnalysis || !currentAnalysis.contract_optimization) {
        showMessage('没有可下载的修改后合同', 'warning');
        return;
    }
    
    const optimizedText = currentAnalysis.contract_optimization.optimized_text;
    const filename = `修改后合同_${new Date().toISOString().slice(0, 10)}.txt`;
    
    downloadTextFile(optimizedText, filename);
    showMessage('修改后合同下载成功', 'success');
}

// 下载翻译后的合同
function downloadTranslatedText() {
    if (!currentAnalysis || !currentAnalysis.translation) {
        showMessage('没有可下载的翻译版本', 'warning');
        return;
    }
    
    const translatedText = currentAnalysis.translation.translated_text;
    const targetLanguage = currentAnalysis.translation.target_language;
    const filename = `翻译合同_${targetLanguage}_${new Date().toISOString().slice(0, 10)}.txt`;
    
    downloadTextFile(translatedText, filename);
    showMessage('翻译版本下载成功', 'success');
}

// 通用文本文件下载函数
function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}