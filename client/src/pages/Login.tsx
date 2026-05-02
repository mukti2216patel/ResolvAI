import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, LogIn, Mail, Lock, AlertCircle } from 'lucide-react';
import { loginSchema, type LoginFormValues } from 'core';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ThemeToggle from '@/components/ThemeToggle';

export default function Login() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError('');

    const { error: signInError } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      setError(signInError.message || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-primary px-4 py-12">
      {/* Floating Theme Toggle in top-right */}
      <div className="absolute right-6 top-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated gradient orbs — jade is now the dominant orb */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] animate-[pulse_6s_ease-in-out_infinite] rounded-full bg-[#00d4a1]/12 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] animate-[pulse_8s_ease-in-out_infinite_1s] rounded-full bg-[#6c63ff]/12 blur-[140px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 animate-[pulse_7s_ease-in-out_infinite_0.5s] rounded-full bg-[#00d4a1]/8 blur-[100px]" />
      </div>

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,161,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,161,0.12) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-[fadeIn_0.5s_ease]">

        {/* ── Logo & Branding ── */}
        <div className="mb-8 flex flex-col items-center gap-4">

          {/* Custom SVG logo */}
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-2xl bg-[#00d4a1]/20 blur-2xl scale-110" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#00d4a1]/30 bg-gradient-to-br from-[#00d4a1]/15 via-[#0d0f17] to-[#6c63ff]/15 shadow-[0_0_40px_rgba(0,212,161,0.3),inset_0_1px_0_rgba(0,212,161,0.15)]">
              <svg
                width="44"
                height="44"
                viewBox="0 0 44 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Ticket body */}
                <path
                  d="M5 15a2 2 0 012-2h30a2 2 0 012 2v4a4 4 0 000 8v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4a4 4 0 000-8v-4z"
                  fill="url(#ticketFill)"
                  stroke="#00d4a1"
                  strokeWidth="1.25"
                  strokeLinejoin="round"
                />
                {/* Perforated divider */}
                <line
                  x1="15"
                  y1="13"
                  x2="15"
                  y2="31"
                  stroke="#00d4a1"
                  strokeWidth="1"
                  strokeDasharray="2 2.5"
                  strokeLinecap="round"
                />
                {/* Stub dots */}
                <circle cx="10" cy="22" r="1.5" fill="#00d4a1" fillOpacity="0.7" />
                {/* Main area — circuit-style lines */}
                <line x1="20" y1="18" x2="33" y2="18" stroke="#00d4a1" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                <line x1="20" y1="22" x2="29" y2="22" stroke="#00d4a1" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.9" />
                <line x1="20" y1="26" x2="33" y2="26" stroke="#00d4a1" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
                {/* Accent dot on the active line */}
                <circle cx="31" cy="22" r="2" fill="#00d4a1" />
                <circle cx="31" cy="22" r="1" fill="#06070a" />
                <defs>
                  <linearGradient id="ticketFill" x1="5" y1="13" x2="39" y2="35" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#00d4a1" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#6c63ff" stopOpacity="0.12" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Title — no .sys */}
          <div className="text-center">
            <h1 className="font-heading text-3xl font-bold uppercase tracking-[0.2em]">
              <span className="text-text-primary/50 font-light">HELP</span>
              <span
                className="font-extrabold"
                style={{
                  background: 'linear-gradient(90deg, #00d4a1 0%, #6c63ff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DESK
              </span>
            </h1>
            <p className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-text-secondary">
              AI_TICKET_MANAGEMENT_INTERFACE
            </p>
          </div>
        </div>

        {/* ── Login Card ── */}
        <Card className="relative overflow-hidden border-[#00d4a1]/25 bg-bg-card/90 shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_60px_rgba(0,212,161,0.06)] backdrop-blur-md">
          {/* Top border gradient — brighter jade line */}
          <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[#00d4a1] via-[#6c63ff] to-[#00d4a1] opacity-80" />
          {/* Subtle inner top glow */}
          <div className="absolute left-0 right-0 top-0 h-16 bg-gradient-to-b from-[#00d4a1]/5 to-transparent" />

          <CardHeader className="relative pb-2 text-center">
            <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider text-text-primary">
              Welcome back
            </CardTitle>
            <CardDescription className="font-mono text-xs tracking-wide text-text-secondary">
              Sign in to terminate tickets
            </CardDescription>
          </CardHeader>

          <CardContent className="relative">
            {error && (
              <Alert variant="destructive" className="mb-5 border border-danger/30 bg-danger/10 font-mono text-xs text-danger">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">

              {/* Email Field */}
              <div className="grid gap-2">
                <Label
                  htmlFor="login-email"
                  className="font-mono text-[0.68rem] uppercase tracking-wider text-text-secondary"
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#00d4a1]/60" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="user@helpdesk.sys"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    className="login-input h-10 pl-9 font-mono text-sm"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="font-mono text-xs text-danger">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="grid gap-2">
                <Label
                  htmlFor="login-password"
                  className="font-mono text-[0.68rem] uppercase tracking-wider text-text-secondary"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#00d4a1]/60" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className="login-input h-10 pl-9 font-mono text-sm"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="font-mono text-xs text-danger">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="login-btn mt-1 w-full cursor-pointer font-mono text-xs font-bold uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin-slow" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center font-mono text-[0.62rem] uppercase tracking-[0.15em] text-text-muted">
          Secure login powered by Better Auth
        </p>
      </div>
    </div>
  );
}