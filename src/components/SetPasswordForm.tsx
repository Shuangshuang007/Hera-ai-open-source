'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';

interface SetPasswordFormProps {
  email: string;
  onBack: () => void;
}

export const SetPasswordForm = ({ email, onBack }: SetPasswordFormProps) => {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code === '917917') {
      router.push('/profile');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-8">
        <Logo />
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
      </div>

      <h1 className="text-xl font-semibold text-center mb-6">Sign in with login code</h1>
      <p className="text-sm text-gray-600 text-center mb-6">
        We've sent your one-time passcode to{' '}
        <span className="font-medium">{email}</span>. This passcode will expire after 10 minutes.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Enter 6-digit code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            pattern="[0-9]{6}"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Sign in
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-gray-700 mb-2">Didn't receive your code?</p>
        <button
          type="button"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Send new code
        </button>
      </div>
    </div>
  );
}; 