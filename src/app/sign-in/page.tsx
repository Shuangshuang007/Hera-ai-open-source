'use client';

import { useState } from 'react';
import { SignInForm } from '@/components/SignInForm';
import { SetPasswordForm } from '@/components/SetPasswordForm';

export default function SignInPage() {
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');

  const handleEmailSubmit = (submittedEmail: string) => {
    setEmail(submittedEmail);
    setStep('password');
  };

  const handleBack = () => {
    setStep('email');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {step === 'email' ? (
        <SignInForm onEmailSubmit={handleEmailSubmit} />
      ) : (
        <SetPasswordForm email={email} onBack={handleBack} />
      )}
    </div>
  );
} 