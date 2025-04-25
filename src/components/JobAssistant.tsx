import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface JobAssistantProps {
  onUpdatePreferences: (preferences: any) => void;
}

export const JobAssistant: React.FC<JobAssistantProps> = ({ onUpdatePreferences }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: "Hi, I'm Hera – ask me about any job or requirement." 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();
      
      if (data.preferences) {
        setMessages(prev => [
          ...prev,
          { 
            role: 'assistant', 
            content: `I understand your preferences are:\n${JSON.stringify(data.preferences, null, 2)}\n\nWould you like to update your job recommendations based on these preferences?` 
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'I apologize, but I did not understand your requirements. Could you please rephrase?' }
        ]);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = (preferences: any) => {
    onUpdatePreferences(preferences);
    setMessages(prev => [
      ...prev,
      { role: 'assistant', content: 'Updated your job preferences. Searching for new positions...' }
    ]);
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-white text-[#2563eb] p-3 rounded-xl cursor-pointer shadow-md hover:bg-gray-50 transition-colors duration-200 border border-gray-200 z-50"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#2563eb]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
          </svg>
          <span className="text-[#2563eb] font-semibold text-[13px]">Héra AI</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 半透明背景遮罩 */}
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40" />
      
      <div className="fixed bottom-4 right-4 w-1/3 max-w-[360px] min-w-[280px] bg-white rounded-xl shadow-md border border-gray-200 flex flex-col z-50" style={{ maxHeight: '400px' }}>
        <div className="px-3 py-2.5 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-xl">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <span className="text-[#2563eb] font-semibold text-[13px] tracking-tight">
                Héra AI
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-gray-50">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`${
                message.role === 'user' 
                  ? 'ml-auto bg-[#e8f0fe] text-[#1a56db] border border-[#2563eb]/10' 
                  : 'bg-white text-[#374151] border border-gray-200'
              } p-2.5 rounded-lg max-w-[85%] text-[13px] leading-relaxed shadow-sm`}
            >
              {message.content}
            </div>
          ))}
          {isLoading && (
            <div className="p-2.5 rounded-lg bg-white text-[#374151] max-w-[85%] text-[13px] shadow-sm border border-gray-200">
              Thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl">
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about a job or a post..."
              className="flex-1 text-[13px] border border-gray-300 focus:border-[#2563eb] focus:ring-[#2563eb] rounded-full h-8 bg-white placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              onClick={handleSend} 
              disabled={isLoading}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-full px-3.5 h-8 text-[13px] shadow-sm"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}; 