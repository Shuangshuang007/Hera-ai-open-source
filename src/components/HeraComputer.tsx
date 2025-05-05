import React, { useRef } from 'react';

interface HeraComputerProps {
  terminalOutput: string[];
  isProcessing?: boolean;
}

export function HeraComputer({ terminalOutput, isProcessing = false }: HeraComputerProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="!w-full !md:w-[40%] bg-[#f9fafb] border-l border-[#e5e7eb] overflow-y-auto min-h-[300px] md:min-h-0">
      <div className="sticky top-0 p-4">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Héra Computer</h2>
        <div
          ref={terminalRef}
          className="font-mono text-sm leading-[20px] whitespace-pre-wrap bg-white rounded-lg p-4 border border-gray-200 overflow-y-auto w-full max-w-full"
          id="hera-computer-terminal"
          style={{ 
            height: '800px',
            overflowY: 'scroll',
            scrollbarWidth: 'thin',
            scrollbarColor: '#94A3B8 transparent',
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: '12px',
            lineHeight: '20px',
            backgroundColor: '#ffffff',
            color: '#374151'
          }}
        >
          <div className="space-y-1">
            {terminalOutput.map((line, index) => {
              // 处理编译消息的颜色
              if (line.startsWith('○ Compiling')) {
                return (
                  <div key={index} className="text-blue-600">
                    {line}
                  </div>
                );
              }
              // 处理编译完成消息的颜色
              if (line.startsWith('✓ Compiled')) {
                return (
                  <div key={index} className="text-green-600">
                    {line}
                  </div>
                );
              }
              // 处理错误消息的颜色
              if (line.startsWith('❌')) {
                return (
                  <div key={index} className="text-red-600">
                    {line}
                  </div>
                );
              }
              // 处理成功消息的颜色
              if (line.startsWith('✅') || line.startsWith('✨') || line.startsWith('🎉')) {
                return (
                  <div key={index} className="text-green-600">
                    {line}
                  </div>
                );
              }
              // 处理 API 调用参数的格式化
              if (line.includes('API called with:')) {
                const [prefix, params] = line.split('API called with:');
                return (
                  <div key={index}>
                    <span className="text-gray-600">{prefix}API called with:</span>
                    <pre className="text-blue-600 pl-4 mt-1">{params}</pre>
                  </div>
                );
              }
              // 默认文本颜色
              return (
                <div key={index} className="text-gray-600">
                  {line}
                </div>
              );
            })}
          </div>
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
} 