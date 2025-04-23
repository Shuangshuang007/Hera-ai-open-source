import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const text = await file.text(); // 支持 txt、docx、pdf 已预解析

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "你是一个结构化简历解析助手，请只返回 JSON，不要添加解释"
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
    { "company": "", "position": "", "startDate": "", "endDate": "", "summary": "" }
  ]
}

以下是简历内容：
${text}`.trim()
      }
    ],
    temperature: 0
  });

  let raw = completion.choices?.[0]?.message?.content || '';
  raw = raw.replace(/```json\s*|```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json({ parsed });
  } catch (e) {
    return NextResponse.json({ error: "GPT 返回无法解析为 JSON", debug: raw }, { status: 400 });
  }
}
