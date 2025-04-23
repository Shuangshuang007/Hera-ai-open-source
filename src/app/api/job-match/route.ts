import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_JOB_MATCH
});

interface JobMatchRequest {
  jobTitle: string;
  jobDescription: string;
  jobRequirements: string[];
  jobLocation: string;
  userProfile: {
    jobTitles: string[];
    skills: string[];
    city: string;
    seniority: string;
    openToRelocate: boolean;
    careerPriorities?: string[];
    expectedSalary?: string;
    currentPosition?: string;
    expectedPosition?: string;
    employmentHistory?: Array<{
      company: string;
      position: string;
    }>;
  };
}

// 判断用户类型
function determineUserType(userProfile: JobMatchRequest['userProfile']): 'opportunity' | 'fit' | 'neutral' {
  const careerPriorities = userProfile.careerPriorities || [];
  
  // 检查是否选择了机会型选项
  const opportunityPriorities = ['Company Reputation', 'Higher Compensation', 'Clear Promotion Pathways'];
  const hasOpportunityPriority = opportunityPriorities.some(priority => 
    careerPriorities.includes(priority)
  );
  
  // 检查是否选择了匹配型选项
  const fitPriorities = ['Work-Life Balance', 'Industry Fit', 'Functional Fit'];
  const hasFitPriority = fitPriorities.some(priority => 
    careerPriorities.includes(priority)
  );
  
  // 检查其他条件
  const isSeniorWithHighSalary = userProfile.seniority === 'Senior' && 
    userProfile.expectedSalary === 'Highest';
  
  const hasSignificantPositionJump = userProfile.currentPosition && 
    userProfile.expectedPosition &&
    ['Director', 'VP', 'C-level'].includes(userProfile.expectedPosition) &&
    ['Manager', 'Senior Manager'].includes(userProfile.currentPosition);
  
  // 判断用户类型
  if (hasOpportunityPriority || 
      (isSeniorWithHighSalary) || 
      (userProfile.openToRelocate && hasOpportunityPriority) ||
      hasSignificantPositionJump) {
    return 'opportunity';
  }
  
  if (careerPriorities.includes('Work-Life Balance') ||
      (careerPriorities.includes('Industry Fit') && careerPriorities.includes('Functional Fit')) ||
      (!hasOpportunityPriority && !userProfile.openToRelocate)) {
    return 'fit';
  }
  
  return 'neutral';
}

// 计算职位匹配分数
async function calculateMatchScore(
  userType: 'opportunity' | 'fit' | 'neutral',
  jobData: Omit<JobMatchRequest, 'userProfile'>,
  userProfile: JobMatchRequest['userProfile']
): Promise<{ score: number; highlights: string[]; listSummary: string; detailedSummary: string; analysis: string }> {
  const prompt = `
    As a professional career advisor, analyze the match between the candidate's profile and this job position.
    
    User Type: ${userType === 'opportunity' ? 'Good Opportunity Seeker' : 
                userType === 'fit' ? 'Good Fit Seeker' : 'Neutral Seeker'}
    
    Job Details:
    - Title: ${jobData.jobTitle}
    - Description: ${jobData.jobDescription}
    - Location: ${jobData.jobLocation}
    - Required Skills: ${jobData.jobRequirements.join(', ')}
    
    Candidate Profile:
    - Skills: ${userProfile.skills.join(', ') || 'Not specified'}
    - Location: ${userProfile.city}
    - Seniority Level: ${userProfile.seniority}
    - Open to Relocation: ${userProfile.openToRelocate ? 'Yes' : 'No'}
    - Career Priorities: ${userProfile.careerPriorities?.join(', ') || 'Not specified'}
    - Expected Position: ${userProfile.expectedPosition || 'Not specified'}
    - Current Position: ${userProfile.currentPosition || 'Not specified'}
    
    Please provide:
    1. A match score between 65-95 based on the user type and matching criteria
    2. Three concise bullet points highlighting key matching aspects (each under 10 words)
    3. A brief job list summary (1 sentence, max 20 words) that includes:
       - Company industry/type/scale
       - Core job responsibilities or key requirements
       - Location (city name only)
       Format: "[Company Info] seeking [Position] in [City]"
    4. A detailed job summary divided into three sections for the job detail panel:
       - Who we are: Brief company introduction and culture
       - Who we are looking for: Key requirements and ideal candidate profile
       - Benefits and Offerings: What makes this position attractive
    5. A comprehensive matching analysis written in paragraphs:

       a) Overview (1-2 paragraphs):
          Provide a holistic assessment of the match quality, considering both technical and cultural fit.
          Include key factors that influenced the match score.

       b) Strengths to Stand Out (1 paragraph):
          Highlight the candidate's strongest matching points and competitive advantages for this position.
          Focus on direct matches in skills, experience, and qualifications.

       c) Potential Improvement Areas (1 paragraph):
          Address gaps in required skills or experience.
          Provide specific suggestions for the application process (focus only on application-stage advice).
          Note any immediate steps that could strengthen the application.

       d) Transferable Advantages (1 paragraph):
          Discuss relevant skills and experiences that, while not direct matches, could add value.
          Explain how these transferable skills apply to the role.

       e) Other Considerations (optional, 1 paragraph):
          Include any additional factors worth noting (e.g., international experience, industry transitions).
          Mention any unique circumstances that could influence the application.
    
    For Good Opportunity Seekers, prioritize:
    - Company reputation and funding status
    - Competitive compensation mentions
    - Position level vs expected position
    - Required qualifications and experience
    
    For Good Fit Seekers, prioritize:
    - Career priorities alignment
    - Work-life balance mentions
    - Industry and functional fit
    - Required qualifications and experience
    
    Consider location compatibility and highlight any significant location differences.
    
    Format your response as:
    Score: [number]
    
    Highlights:
    • [point 1]
    • [point 2]
    • [point 3]
    
    List Summary:
    [1 sentence summary]
    
    Detailed Summary:
    Who we are:
    [paragraph]
    
    Who we are looking for:
    [paragraph]
    
    Benefits and Offerings:
    [paragraph]
    
    Analysis:
    Overview:
    [1-2 paragraphs assessing overall match quality]

    Strengths to Stand Out:
    [1 paragraph highlighting key matching points]

    Potential Improvement Areas:
    [1 paragraph addressing gaps and application advice]

    Transferable Advantages:
    [1 paragraph discussing relevant indirect matches]

    Other Considerations:
    [1 paragraph on additional factors, if applicable]
    `;

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-1106",
    messages: [
      {
        role: "system",
        content: "You are a professional career advisor providing detailed job match analysis and scoring."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });

  const response = completion.choices[0].message.content || '';
  
  // 解析响应
  const scoreMatch = response.match(/Score:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 75;
  
  // 提取 highlights
  const highlightsMatch = response.match(/Highlights:\n((?:•[^\n]+\n?)+)/);
  const highlights = highlightsMatch 
    ? highlightsMatch[1].split('\n').filter(line => line.trim().startsWith('•')).map(line => line.trim().substring(1).trim())
    : [];
  
  // 提取 list summary
  const listSummaryMatch = response.match(/List Summary:\n([\s\S]*?)(?=\n\nDetailed Summary:)/);
  const listSummary = listSummaryMatch ? listSummaryMatch[1].trim() : '';
  
  // 提取 detailed summary
  const detailedSummaryMatch = response.match(/Detailed Summary:\n([\s\S]*?)(?=\n\nAnalysis:)/);
  const detailedSummary = detailedSummaryMatch ? detailedSummaryMatch[1].trim() : '';
  
  // 提取详细分析
  const analysisMatch = response.match(/Analysis:\n([\s\S]*?)$/);
  const analysis = analysisMatch ? analysisMatch[1].trim() : '';
  
  return {
    score: Math.min(Math.max(score, 65), 95),
    highlights,
    listSummary,
    detailedSummary,
    analysis
  };
}

export async function POST(request: Request) {
  try {
    const data: JobMatchRequest = await request.json();
    
    // 确定用户类型
    const userType = determineUserType(data.userProfile);
    
    // 计算匹配分数和分析
    const { score, highlights, listSummary, detailedSummary, analysis } = await calculateMatchScore(userType, data, data.userProfile);
    
    return NextResponse.json({ 
      score,
      highlights,
      listSummary,
      detailedSummary,
      analysis,
      userType
    });
  } catch (error) {
    console.error('Error analyzing job match:', error);
    return NextResponse.json(
      { error: 'Failed to analyze job match' },
      { status: 500 }
    );
  }
} 