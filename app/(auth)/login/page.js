'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Image from 'next/image';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <Input
        label="Username"
        type="text"
        placeholder="Enter username"
        icon={User}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="username"
      />

      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
        icon={Lock}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
      >
        Sign In
      </Button>
    </form>
  );
}

function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Extra cosmic background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-500 rounded-2xl blur-xl opacity-60 animate-pulse-slow" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-brand-500 to-accent-500 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden">
                <Image src="/icon.svg" alt="MazeTokenomics" width={64} height={64} className="w-full h-full" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold cosmic-text">Maze</h1>
              <p className="text-sm text-gray-400">Tokenomics</p>
            </div>
          </div>
          <p className="text-gray-400 mt-2 text-center text-sm sm:text-base">
            Sign in to track and analyze tokens
          </p>
        </div>

        <div className="cosmic-card p-6">
          <Suspense fallback={<LoginFormFallback />}>
            <LoginForm />
          </Suspense>

          {/* Credentials hint */}
          <div className="mt-6 p-4 bg-dark-bg/50 rounded-lg border border-brand-500/10">
            <p className="text-xs text-brand-300 mb-2">Default Login:</p>
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Username:</span> maze
            </p>
            <p className="text-xs text-gray-400">
              <span className="text-gray-500">Password:</span> maze
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          <span className="cosmic-text font-medium">MazeTokenomics</span>
        </p>
      </div>
    </div>
  );
}
