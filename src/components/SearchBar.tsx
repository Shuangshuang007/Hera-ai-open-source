"use client";
import { Search } from 'lucide-react';

export default function SearchBar() {
  return (
    <div className="max-w-3xl mx-auto">
      <form className="flex gap-2 p-2 bg-white rounded-lg shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Job title, keywords or company"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Melbourne VIC"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Find Jobs
        </button>
      </form>
    </div>
  );
} 