"use client";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Logo } from '@/components/Logo';

export default function SignInPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* 左上角Logo */}
      <div className="absolute left-8 top-8">
        <Logo />
      </div>
      {/* 右上角Back按钮 */}
      <button
        className="absolute right-8 top-8 text-blue-600 hover:underline text-base flex items-center"
        onClick={() => router.push('/')}
      >
        <span className="mr-1">←</span> Back
      </button>
      {/* 中间登录按钮 */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col items-center w-full max-w-md">
          <button
            className="w-full flex items-center justify-center border border-gray-300 rounded-md py-3 mb-4 text-lg font-medium hover:bg-gray-100"
            onClick={() => signIn("google")}
          >
            <img src="/google-icon.svg" alt="Google" className="w-6 h-6 mr-2" />
            Continue with Google
          </button>
          <button
            className="w-full flex items-center justify-center border border-gray-300 rounded-md py-3 text-lg font-medium hover:bg-gray-100"
            onClick={() => signIn("github")}
          >
            <img src="/github-icon.svg" alt="GitHub" className="w-6 h-6 mr-2" />
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
} 