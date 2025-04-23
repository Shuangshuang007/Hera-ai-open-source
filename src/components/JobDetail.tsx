  <div className="bg-white shadow rounded-lg p-6">
    {/* 职位标题和基本信息 */}
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
      <div className="mt-2 flex items-center text-sm text-gray-500">
        <BuildingOffice2Icon className="h-5 w-5 text-gray-400 mr-2" />
        <span>{job.company}</span>
        <span className="mx-2">•</span>
        <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
        <span>{job.location}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-500">
          <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span>{job.postedDate || 'Recently posted'}</span>
          <span className="mx-2">•</span>
          <span>{job.platform}</span>
        </div>
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={() => window.open(job.url, '_blank')}
          >
            {language === 'zh' ? '搜索相似职位' : 'Search Similar Jobs'}
          </Button>
          <Button onClick={() => onApply(job)}>
            {language === 'zh' ? '自动申请' : 'Auto Apply'}
          </Button>
        </div>
      </div>
    </div>

    {/* Job Summary */}
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {language === 'zh' ? '职位概要' : 'Job Summary'}
      </h3>
      <div className="prose prose-sm max-w-none text-gray-600">
        {jobSummary.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-2">{paragraph}</p>
        ))}
      </div>
    </div>

    {/* Matching Summary */}
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {language === 'zh' ? '匹配分析' : 'Matching Summary'}
      </h3>
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-sm font-semibold text-blue-700 mb-3">
          {language === 'zh' ? '匹配分数' : 'Match Score'}: {matchScore}
        </div>
        <div className="prose prose-sm max-w-none text-gray-700">
          {matchAnalysis.split('\n').map((line, index) => (
            <p key={index} className="mb-2">{line}</p>
          ))}
        </div>
      </div>
    </div>

    {/* 职位描述 */}
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {language === 'zh' ? '职位描述' : 'Job Description'}
      </h3>
      <div className="prose prose-sm max-w-none text-gray-600">
        {job.description.split('\n').map((paragraph, index) => (
          <p key={index} className="mb-2">{paragraph}</p>
        ))}
      </div>
    </div>

    {/* 技能要求 */}
    {job.requirements && job.requirements.length > 0 && (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {language === 'zh' ? '技能要求' : 'Requirements'}
        </h3>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          {job.requirements.map((req, index) => (
            <li key={index}>{req}</li>
          ))}
        </ul>
      </div>
    )}

    {/* 福利待遇 */}
    {job.benefits && job.benefits.length > 0 && (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {language === 'zh' ? '福利待遇' : 'Benefits'}
        </h3>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          {job.benefits.map((benefit, index) => (
            <li key={index}>{benefit}</li>
          ))}
        </ul>
      </div>
    )}
  </div> 