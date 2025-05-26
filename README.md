# Hera AI Job Search Platform

## 快速开始

1. 克隆仓库
```bash
git clone [repository-url]
cd [repository-name]
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建 `.env.local` 文件并配置必要的环境变量（见下方说明）

4. 启动服务
```bash
# 启动主应用服务（端口 3002）
npm run dev

# 启动职位抓取服务（端口 4000）
cd seek-crawler-api
npm install
npm run dev
```

## Environment Variables Configuration

### Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Database Configuration
DATABASE_URL=your_database_url_here

# API Configuration
PORT=3002  # Main application port
PORT=4000  # Job crawler service port (in seek-crawler-api directory)

# Other Configuration
NODE_ENV=development  # or production
```

### 环境变量配置说明

在项目根目录创建 `.env.local` 文件，并配置以下必要的环境变量：

```env
# OpenAI API 配置
OPENAI_API_KEY=你的OpenAI API密钥

# 数据库配置
DATABASE_URL=你的数据库连接URL

# API 配置
PORT=3002  # 主应用端口
PORT=4000  # 职位抓取服务端口（在 seek-crawler-api 目录下）

# 其他配置
NODE_ENV=development  # 或 production
```

### API 接口说明

#### 职位抓取服务 (localhost:4000)

职位抓取服务运行在 4000 端口，提供以下接口：

1. 获取职位列表
```bash
GET http://localhost:4000/api/seek-jobs
```

请求参数：
- `jobTitle`: 职位名称（默认：software-engineer）
- `city`: 城市名称（默认：melbourne）
- `limit`: 返回结果数量限制（默认：25）

示例请求：
```bash
curl "http://localhost:4000/api/seek-jobs?jobTitle=Software%20Engineer&city=Sydney&limit=60"
```

返回数据格式：
```json
{
  "jobs": [
    {
      "title": "职位标题",
      "company": "公司名称",
      "location": "工作地点",
      "description": "职位描述",
      "fullDescription": "完整职位描述",
      "requirements": ["要求1", "要求2"],
      "url": "职位链接",
      "source": "来源",
      "platform": "seek",
      "summary": "AI生成的职位概要",
      "detailedSummary": "AI生成的详细分析",
      "matchScore": 85,
      "matchAnalysis": "AI生成的匹配分析"
    }
  ]
}
```

### 获取必要的 API 密钥

1. OpenAI API Key:
   - 访问 [OpenAI Platform](https://platform.openai.com/)
   - 注册并登录您的账户
   - 在 API Keys 部分创建新的 API 密钥
   - 复制生成的密钥并设置到 `OPENAI_API_KEY` 环境变量中

2. Database URL:
   - 根据您使用的数据库类型配置相应的连接 URL
   - 格式示例：`postgresql://username:password@localhost:5432/database_name`

### 注意事项

- 请确保不要将包含实际 API 密钥的 `.env.local` 文件提交到版本控制系统
- 建议将 `.env.local` 添加到 `.gitignore` 文件中
- 在部署到生产环境时，请使用安全的密钥管理方式
- 主应用和职位抓取服务需要分别启动，它们使用不同的端口（3002 和 4000）

### 验证配置

配置完成后，可以通过以下步骤验证环境变量是否正确加载：

1. 启动主应用服务：
```bash
npm run dev
```

2. 启动职位抓取服务：
```bash
cd seek-crawler-api
npm run dev
```

3. 测试 API 端点：
```bash
# 测试主应用
curl http://localhost:3002/api/jobs

# 测试职位抓取服务
curl http://localhost:4000/api/seek-jobs
```

如果遇到 "Unauthorized" 错误，请检查 `OPENAI_API_KEY` 是否正确配置。

