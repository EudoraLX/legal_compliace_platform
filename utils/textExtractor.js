const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

// 文本提取函数
async function extractText(filePath, fileType) {
  try {
    if (fileType === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } else if (fileType === '.docx' || fileType === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (fileType === '.txt') {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (error) {
    throw new Error(`文本提取失败: ${error.message}`);
  }
}

module.exports = {
  extractText
}; 