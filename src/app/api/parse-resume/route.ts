export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import * as mammoth from 'mammoth';

// 添加 API Key 检查函数
function checkApiKey() {
  const apiKey = process.env.OPENAI_API_KEY_Parse_Resume;
  if (!apiKey) {
    console.log('❌ Error: OPENAI_API_KEY_Parse_Resume not found in .env.local');
    return false;
  }
  return apiKey.startsWith('sk-');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_Parse_Resume,
  baseURL: 'https://api.openai.com/v1',
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
  console.log('File type:', fileType);
  
  try {
    let text = '';
    
    if (fileType === 'text/plain') {
      // Process text file
      text = await file.text();
    } else if (fileType === 'application/pdf') {
      // Process PDF file
      const arrayBuffer = await file.arrayBuffer();
      const dataBuffer = Buffer.from(arrayBuffer);
      // 明确确认类型是 Node.js Buffer
      if (!Buffer.isBuffer(dataBuffer)) {
        throw new Error('PDF input is not a Node.js Buffer');
      }
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      // Process Word file
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    // Clean and preprocess text
    text = preprocessResumeText(text);
    console.log('Processed text length:', text.length);
    
    return text;
  } catch (error) {
    console.error('File processing error:', error);
    throw new Error('Unable to read file content, please ensure the file format is correct');
  }
}

export async function POST(request: Request) {
  try {
    console.log('○ Starting resume parsing process');
    
    // First check API Key
    if (!checkApiKey()) {
      console.log('❌ Error: OpenAI API key not properly configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not properly configured' },
        { status: 500 }
      );
    }
    console.log('✓ OpenAI API key validated');

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('❌ Error: No file received');
      return NextResponse.json(
        { error: 'Please upload a resume file' },
        { status: 400 }
      );
    }

    console.log(`✓ Received file: ${file.name} (${file.type})`);

    // Extract text content
    console.log('○ Extracting text from file...');
    const text = await extractTextFromFile(file);
    console.log(`✓ Extracted ${text.length} characters of text`);
    console.log('Text preview:\n' + text.substring(0, 200));

    try {
      console.log('○ Calling OpenAI API to parse resume...');
      // Call OpenAI API to parse resume
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a structured resume parsing assistant. Please note: 1) Dates must be returned in YYYY-MM format; 2) For Present, Now, etc., return current year and month; 3) If date doesn't exist, return empty string; 4) Return only JSON, no explanations"
          },
          {
            role: "user",
            content: `
Please extract information from the following resume in the following format (must return strict JSON format):

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

Note:
- All dates must be in YYYY-MM format, e.g. "2023-12"
- For current work, endDate should be current year and month, e.g. "2024-03"
- If date doesn't exist, return empty string ""
- Do not use default values or placeholder dates

Here is the resume content:
${text}
            `.trim()
          }
        ],
        temperature: 0
      });
      
      let raw = completion.choices?.[0]?.message?.content || '';
      raw = raw.replace(/^```json\s*|```$/g, '').trim();
      console.log('✓ Received response from OpenAI API');
      console.log('Raw response:\n' + raw);

      try {
        const parsed = JSON.parse(raw);
        console.log('✓ Successfully parsed JSON response');
        
        // Log parsed data details
        console.log(`Found ${parsed.skills?.length || 0} skills`);
        console.log(`Found ${parsed.education?.length || 0} education entries`);
        console.log(`Found ${parsed.employmentHistory?.length || 0} employment entries`);
        
        if (parsed.employmentHistory?.length > 0) {
          console.log('Employment history dates:');
          parsed.employmentHistory.forEach((emp: any, index: number) => {
            console.log(`  ${index + 1}. ${emp.company}: ${emp.startDate} to ${emp.endDate}`);
          });
        }

        return NextResponse.json(parsed);
      } catch (e) {
        console.error('❌ Error: Failed to parse JSON response');
        console.error('Raw response:\n' + raw);
        return NextResponse.json({ error: "Failed to parse response as JSON" }, { status: 400 });
      }
    } catch (error: any) {
      console.error('❌ Error: Resume parsing failed');
      console.error('Error details:\n' + error.stack);
      return NextResponse.json(
        { error: `Resume parsing failed: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error: Failed to process resume');
    console.error('Error details:\n' + error.stack);
    return NextResponse.json(
      { error: 'Failed to process resume, please try again' },
      { status: 500 }
    );
  }
} 
