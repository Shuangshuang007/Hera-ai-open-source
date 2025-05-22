"use client";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Logo } from '@/components/Logo';
import { StorageManager } from '@/utils/storage';

export default function HomePage() {
  const router = useRouter();
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const userState = StorageManager.getUserState();
    
    if (!userState.profile) {
      // 首次登录或没有任何历史记录
      router.push('/profile');
    } else if (userState.lastSearch) {
      // 已有历史 Profile 且完成过一次搜索
      router.push('/jobs');
    } else if (userState.profileCompletion?.isComplete) {
      // 已有 Profile 但未完成 Job Search
      router.push('/profile');
    } else {
      // 默认情况
      router.push('/profile');
    }
  }, [router]);

  // 登录状态检测函数（伪代码，后续可抽到utils/auth.ts）
  function isLoggedIn() {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');
    if (!token || !loginTime) return false;
    const now = Date.now();
    return now - Number(loginTime) < 15 * 24 * 60 * 60 * 1000;
  }

  const handleGetStarted = () => {
    if (isLoggedIn()) {
      router.push('/profile');
    } else {
      router.push('/sign-in');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 顶部导航栏 */}
      <div className="flex justify-between items-center px-12 pt-8">
        <div>
          <Logo />
          </div>
        <div className="flex items-center space-x-6">
          <select
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            <option value="en">ENG</option>
            <option value="zh">中文</option>
          </select>
          <button
            className="px-5 py-2 border border-blue-600 text-blue-600 bg-white rounded-md font-medium hover:bg-blue-50 transition"
            onClick={() => router.push('/about')}
          >
            About us
          </button>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition"
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
      </div>
      {/* 中央内容 */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <h1 className="text-5xl font-extrabold text-blue-600 mb-6 tracking-tight">Héra AI</h1>
        <p className="text-2xl text-gray-500 mb-12">Empowering your next career move with AI</p>
        <div className="text-xl text-gray-400 mt-8">[To be updated with video]</div>
      </div>
    </div>
  );
} 