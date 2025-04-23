import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import * as mammoth from 'mammoth';

// 添加 API Key 检查函数
function checkApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  return apiKey && apiKey.startsWith('sk-');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1'
});

// 添加文本预处理函数
function preprocessResumeText(text: string): string {
  // 移除多余的空白字符
  text = text.replace(/\s+/g, ' ').trim();
  
  // 确保关键信息之间有适当的分隔
  text = text
    .replace(/([.!?])\s*([A-Z])/g, '$1\n$2')  // 在句子之间添加换行
    .replace(/([a-z])\s*([A-Z])/g, '$1\n$2')  // 在小写字母后跟大写字母时添加换行
    .replace(/\n{3,}/g, '\n\n')               // 将多个换行减少为两个
    .trim();
  
  // 如果文本太长，截取前面的部分（避免超出 token 限制）
  const maxLength = 4000;
  if (text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  
  return text;
}

// 添加文件类型检查和处理函数
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  console.log('文件类型:', fileType);
  
  try {
    let text = '';
    
    if (fileType === 'text/plain') {
      // 处理文本文件
      text = await file.text();
    } else if (fileType === 'application/pdf') {
      // 处理 PDF 文件
      const buffer = await file.arrayBuffer();
      const dataBuffer = Buffer.from(buffer);
      
      // 动态导入 pdf-parse
      const pdfParse = await import('pdf-parse');
      const pdfData = await pdfParse.default(dataBuffer);
      text = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      // 处理 Word 文件
      const buffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      text = result.value;
    } else {
      throw new Error(`不支持的文件类型: ${fileType}`);
    }
    
    // 清理和预处理文本
    text = preprocessResumeText(text);
    console.log('处理后的文本长度:', text.length);
    
    return text;
  } catch (error) {
    console.error('文件处理错误:', error);
    throw new Error('无法读取文件内容，请确保文件格式正确');
  }
}

export async function POST(request: Request) {
  try {
    // 首先检查 API Key
    if (!checkApiKey()) {
      return NextResponse.json(
        { error: 'OpenAI API key 未正确配置' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: '请上传简历文件' },
        { status: 400 }
      );
    }

    // 提取文本内容
    const text = await extractTextFromFile(file);

    try {
      // 调用 OpenAI API 解析简历
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是一个结构化简历解析助手。请注意：1) 日期必须返回 YYYY-MM 格式；2) 如果是 Present、Now 等表示当前时间的词，请返回当前年月；3) 如果日期不存在则返回空字符串；4) 请只返回 JSON，不要添加解释"
          },
          {
            role: "user",
            content: `
请你从以下简历中提取信息，格式如下（必须严格 JSON 格式返回）：

{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "country": "",
  "city": "",
  "jobTitles": [],
  "skills": [],
  "education": [
    { "school": "", "degree": "", "startYear": "", "endYear": "" }
  ],
  "employmentHistory": [
    { 
      "company": "", 
      "position": "", 
      "startDate": "YYYY-MM", 
      "endDate": "YYYY-MM",  
      "summary": "" 
    }
  ]
}

注意：
- 所有日期必须是 YYYY-MM 格式，例如 "2023-12"
- 如果是当前工作，endDate 应该是当前年月，例如 "2024-03"
- 如果日期不存在，请返回空字符串 ""
- 不要使用默认值或占位符日期

以下是简历内容：
${text}
            `.trim()
          }
        ],
        temperature: 0
      });
      
      let raw = completion.choices?.[0]?.message?.content || '';
      raw = raw.replace(/^```json\s*|```$/g, '').trim();

      try {
        const parsed = JSON.parse(raw);
        
        // 添加日志
        console.log("GPT 返回的原始 JSON:", raw);
        if (parsed.employmentHistory?.length > 0) {
          console.log("GPT employmentHistory endDate:", parsed.employmentHistory.map(emp => emp.endDate));
        }

        return NextResponse.json(parsed);
      } catch (e) {
        console.error("JSON 解析错误:", e);
        return NextResponse.json({ error: "解析结果格式错误" }, { status: 400 });
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `简历解析失败: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: '简历处理失败，请重试' },
      { status: 500 }
    );
  }
}
