'use client';

import { useState } from 'react';
import { Logo } from './Logo';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SignInFormProps {
  onEmailSubmit: (email: string) => void;
}

export const SignInForm = ({ onEmailSubmit }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onEmailSubmit(email);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-8">
        <Logo />
        <button
          onClick={() => router.push('/')}
          className="flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>
      </div>
      
      <h1 className="text-xl font-semibold text-center mb-6">Ready to take the next step?</h1>
      <p className="text-sm text-gray-600 text-center mb-6">Create an account or sign in.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
          
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <img src="/apple-icon.svg" alt="Apple" className="w-5 h-5" />
            Continue with Apple
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="cv" className="block text-sm font-medium text-gray-700 mb-1">
              Upload your CV
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Automatically create an account by uploading your CV
            </p>
            <input
              type="file"
              id="cv"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Continue
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

      <p className="mt-6 text-xs text-gray-500 text-center">
        By creating an account or signing in, you understand and agree to Hera's{' '}
        <a href="/terms" className="text-blue-600 hover:underline">
          Terms
        </a>
        . We also acknowledge our{' '}
        <a href="/cookie-policy" className="text-blue-600 hover:underline">
          Cookie
        </a>{' '}
        and{' '}
        <a href="/privacy-policy" className="text-blue-600 hover:underline">
          Privacy policies
        </a>
        .
      </p>
    </div>
  );
}; 