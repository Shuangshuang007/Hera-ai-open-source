"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Bell, MessageSquare, User } from 'lucide-react';
import { Logo } from './Logo';

export default function Navbar() {
  const [language, setLanguage] = useState('EN');

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* 左侧 Logo */}
          <Logo />

          {/* 右侧图标 */}
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MessageSquare className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <Link href="/sign-in" className="p-2 hover:bg-gray-100 rounded-full">
              <User className="h-5 w-5 text-gray-600" />
            </Link>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="ml-4 border-none bg-transparent"
            >
              <option value="EN">EN</option>
              <option value="CN">中文</option>
            </select>
          </div>
        </div>
      </div>
    </nav>
  );
} 