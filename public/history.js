// 历史记录组件 JavaScript
let currentPage = 1;
let pageSize = 10;
let totalRecords = 0;
let allHistory = [];
let filteredHistory = [];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
    initializeEventListeners();
});

// 初始化事件监听器
function initializeEventListeners() {
    // 搜索输入框
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // 评分筛选
    const scoreFilter = document.getElementById('scoreFilter');
    if (scoreFilter) {
        scoreFilter.addEventListener('change', handleFilter);
    }

    // 日期筛选
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', handleFilter);
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 返回主页
function goBack() {
    window.location.href = 'index.html';
}

// 刷新历史记录
function refreshHistory() {
    loadHistory();
    showMessage('历史记录已刷新', 'success');
}

// 加载历史记录
async function loadHistory() {
    try {
        showLoadingState();
        console.log('开始加载历史记录...');
        
        const response = await fetch('/api/history');
        console.log('历史记录API响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`加载历史记录失败: HTTP ${response.status}`);
        }
        
        const history = await response.json();
        console.log('获取到的历史记录:', history);
        
        allHistory = history || [];
        totalRecords = allHistory.length;
        
        // 应用筛选和搜索
        applyFiltersAndSearch();
        
        // 更新记录计数
        updateRecordCount();
        
        // 显示分页
        if (totalRecords > pageSize) {
            showPagination();
        } else {
            hidePagination();
        }
        
        console.log('历史记录加载完成');
    } catch (error) {
        console.error('加载历史记录失败:', error);
        showErrorMessage(`加载历史记录失败: ${error.message}`);
    }
}

// 显示加载状态
function showLoadingState() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = `
        <div class="text-center py-5">
            <div class="loading-spinner mb-3"></div>
            <p class="text-muted">正在加载历史记录...</p>
        </div>
    `;
}

// 应用筛选和搜索
function applyFiltersAndSearch() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    const scoreFilter = document.getElementById('scoreFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    
    filteredHistory = allHistory.filter(item => {
        // 搜索筛选
        const matchesSearch = !searchTerm || 
            item.original_name?.toLowerCase().includes(searchTerm) ||
            item.content?.toLowerCase().includes(searchTerm);
        
        // 评分筛选
        const matchesScore = !scoreFilter || 
            (scoreFilter === 'high' && item.risk_score >= 80) ||
            (scoreFilter === 'medium' && item.risk_score >= 60 && item.risk_score < 80) ||
            (scoreFilter === 'low' && item.risk_score < 60);
        
        // 日期筛选
        const matchesDate = !dateFilter || matchesDateFilter(item.created_at, dateFilter);
        
        return matchesSearch && matchesScore && matchesDate;
    });
    
    // 重置分页
    currentPage = 1;
    
    // 显示筛选后的结果
    displayHistoryList();
}

// 日期筛选匹配
function matchesDateFilter(createdAt, filterType) {
    const date = new Date(createdAt);
    const now = new Date();
    
    switch (filterType) {
        case 'today':
            return date.toDateString() === now.toDateString();
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
        case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return date >= monthAgo;
        default:
            return true;
    }
}

// 处理搜索
function handleSearch() {
    applyFiltersAndSearch();
}

// 处理筛选
function handleFilter() {
    applyFiltersAndSearch();
}

// 显示历史记录列表
function displayHistoryList() {
    const historyList = document.getElementById('historyList');
    
    if (filteredHistory.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h4>暂无分析历史</h4>
                <p class="text-muted">您还没有进行过合同分析，或者当前筛选条件下没有匹配的记录</p>
                <button class="btn btn-custom" onclick="goBack()">
                    <i class="fas fa-upload"></i> 开始分析
                </button>
            </div>
        `;
        return;
    }
    
    // 计算分页
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageHistory = filteredHistory.slice(startIndex, endIndex);
    
    const historyHtml = pageHistory.map(item => {
        const scoreClass = getScoreClass(item.risk_score);
        const scoreText = getScoreText(item.risk_score);
        
        return `
            <div class="history-item" onclick="viewHistoryDetail('${item.id}')" data-id="${item.id}">
                <div class="row">
                    <div class="col-md-8">
                        <div class="d-flex align-items-start">
                            <div class="me-3">
                                <i class="fas fa-file-alt fa-2x text-primary"></i>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="mb-2 text-primary">${item.original_name || '未知文件'}</h6>
                                <div class="d-flex align-items-center mb-2">
                                    <i class="fas fa-clock text-muted me-2"></i>
                                    <small class="text-muted">分析时间: ${formatDate(item.created_at)}</small>
                                </div>
                                <div class="d-flex align-items-center">
                                    <i class="fas fa-fingerprint text-info me-2"></i>
                                    <small class="text-info">ID: ${item.id.substring(0, 8)}...</small>
                                </div>
                                ${item.content ? `
                                    <div class="mt-2">
                                        <small class="text-muted">
                                            <i class="fas fa-align-left me-1"></i>
                                            ${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}
                                        </small>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="score-badge ${scoreClass} mb-2">
                            ${item.risk_score || 0}分
                        </div>
                        <div class="mb-2">
                            <small class="text-muted">${scoreText}</small>
                        </div>
                        <div class="btn-group" role="group">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewHistoryDetail('${item.id}', event)" title="查看详情">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="downloadContract('${item.id}', event)" title="下载合同">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteHistory('${item.id}', event)" title="删除记录">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    historyList.innerHTML = historyHtml;
}

// 获取评分样式类
function getScoreClass(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
}

// 获取评分文本
function getScoreText(score) {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '需改进';
}

// 格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 0) {
        return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        return `${diffDays}天前`;
    } else {
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
}

// 更新记录计数
function updateRecordCount() {
    const recordCount = document.getElementById('recordCount');
    if (recordCount) {
        recordCount.textContent = filteredHistory.length;
    }
}

// 显示分页
function showPagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    const pagination = document.getElementById('pagination');
    
    if (!paginationContainer || !pagination) return;
    
    const totalPages = Math.ceil(filteredHistory.length / pageSize);
    
    let paginationHtml = '';
    
    // 上一页
    paginationHtml += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">上一页</a>
        </li>
    `;
    
    // 页码
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    
    // 下一页
    paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">下一页</a>
        </li>
    `;
    
    pagination.innerHTML = paginationHtml;
    paginationContainer.style.display = 'block';
}

// 隐藏分页
function hidePagination() {
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
        paginationContainer.style.display = 'none';
    }
}

// 切换页面
function changePage(page) {
    const totalPages = Math.ceil(filteredHistory.length / pageSize);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayHistoryList();
    showPagination();
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 查看历史详情
async function viewHistoryDetail(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        console.log('正在获取历史详情，ID:', id);
        
        showMessage('正在加载历史详情...', 'info');
        
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
        
        // 保存当前合同数据到全局变量
        window.currentHistoryContract = contract;
        
        // 显示历史详情弹框
        displayHistoryDetailModal(contract);
        
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
        
        document.getElementById('historyDetailContent').innerHTML = content;
        modal.show();
        
    } catch (error) {
        console.error('显示历史详情弹框失败:', error);
        showMessage('显示历史详情弹框失败', 'danger');
    }
}

// 显示风险因素
function displayRiskFactorsInModal(riskFactors) {
    if (!riskFactors || riskFactors.length === 0) {
        return '<p class="text-muted mb-0">暂无风险因素</p>';
    }
    
    return riskFactors.map(risk => `
        <div class="risk-item">
            <h6 class="mb-2">
                <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                ${risk.type || '风险'}
                <span class="badge bg-${getSeverityColor(risk.severity)} ms-2">${risk.severity || 'medium'}</span>
            </h6>
            <p class="mb-2">${risk.description || '暂无描述'}</p>
            ${risk.suggestion ? `<p class="mb-0"><strong>建议：</strong>${risk.suggestion}</p>` : ''}
        </div>
    `).join('');
}

// 显示改进建议
function displaySuggestionsInModal(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        return '<p class="text-muted mb-0">暂无改进建议</p>';
    }
    
    return suggestions.map(suggestion => `
        <div class="suggestion-item">
            <p class="mb-0">
                <i class="fas fa-lightbulb text-success me-2"></i>
                ${suggestion}
            </p>
        </div>
    `).join('');
}

// 显示相关条例
function displayRegulationsInModal(articles) {
    if (!articles || articles.length === 0) {
        return '<p class="text-muted mb-0">暂无相关条例</p>';
    }
    
    return articles.map(article => `
        <div class="regulation-item ${article.compliance ? 'compliant' : 'non-compliant'}">
            <h6 class="mb-2">
                <i class="fas fa-gavel me-2"></i>
                ${article.article || '未知条例'}
                <span class="badge bg-${article.compliance ? 'success' : 'danger'} ms-2">
                    ${article.compliance ? '合规' : '不合规'}
                </span>
            </h6>
            <p class="mb-2"><strong>描述：</strong>${article.description || '暂无描述'}</p>
            <p class="mb-2"><strong>分析：</strong>${article.analysis || '暂无分析'}</p>
            <p class="mb-0"><strong>合同引用：</strong>${article.contract_reference || '无'}</p>
        </div>
    `).join('');
}

// 获取评分徽章颜色
function getScoreBadgeColor(score) {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
}

// 获取评分描述
function getScoreDescription(score) {
    if (score >= 80) return '优秀 - 合同基本符合相关法律法规要求';
    if (score >= 60) return '良好 - 合同基本合规，但存在一些需要改进的地方';
    return '需改进 - 合同存在较多合规问题，建议进行修改';
}

// 获取严重程度颜色
function getSeverityColor(severity) {
    switch (severity?.toLowerCase()) {
        case 'high': return 'danger';
        case 'medium': return 'warning';
        case 'low': return 'info';
        default: return 'secondary';
    }
}

// 下载合同
async function downloadContract(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    try {
        const response = await fetch(`/api/analysis/${id}`);
        if (!response.ok) {
            throw new Error('获取合同数据失败');
        }
        
        const contract = await response.json();
        
        // 创建下载链接
        const blob = new Blob([contract.content || ''], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = contract.original_name || 'contract.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessage('合同下载成功', 'success');
    } catch (error) {
        console.error('下载合同失败:', error);
        showMessage(`下载合同失败: ${error.message}`, 'danger');
    }
}

// 删除历史记录
async function deleteHistory(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('确定要删除这条分析记录吗？此操作不可恢复。')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('删除失败');
        }
        
        showMessage('记录删除成功', 'success');
        
        // 重新加载历史记录
        loadHistory();
        
    } catch (error) {
        console.error('删除历史记录失败:', error);
        showMessage(`删除失败: ${error.message}`, 'danger');
    }
}

// 查看完整分析
function viewFullAnalysis() {
    if (window.currentHistoryContract) {
        // 这里可以跳转到完整的分析页面
        showMessage('功能开发中...', 'info');
    }
}

// 下载分析报告
function downloadAnalysisReport() {
    if (window.currentHistoryContract) {
        // 这里可以实现下载分析报告的功能
        showMessage('功能开发中...', 'info');
    }
}

// 显示消息提示
function showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    
    if (!messageContainer || !messageText) return;
    
    // 设置消息类型样式
    const toast = messageContainer.querySelector('.toast');
    toast.className = `toast align-items-center text-white border-0 bg-${type}`;
    
    // 设置消息内容
    messageText.textContent = message;
    
    // 显示消息
    messageContainer.style.display = 'block';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        messageContainer.style.display = 'none';
    }, 3000);
}

// 显示错误消息
function showErrorMessage(message) {
    const historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
                <button class="btn btn-sm btn-outline-danger ms-3" onclick="loadHistory()">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
    }
} 