import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AudioLines } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Input } from '../components/common/Field.jsx';
import { Button } from '../components/common/Button.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { errorMessage } from '../services/api.js';

export const loginSchema = z.object({ email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });

export default function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });
  if (user) return <Navigate to={loc.state?.from || '/'} replace />;

  const onSubmit = async (v) => {
    setServerError('');
    try { await login(v); nav(loc.state?.from || '/', { replace: true }); } catch (e) { setServerError(errorMessage(e)); }
  };
  return (
    <div className="min-h-dvh grid place-items-center p-4">
      <div className="absolute top-3 right-3"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-8 text-xl font-semibold"><span className="h-10 w-10 rounded-xl bg-accent text-on-accent grid place-items-center"><AudioLines className="h-6 w-6" /></span>VoiceFlow</div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="card p-5 sm:p-6 space-y-4">
          <div><h1 className="!text-xl">Sign in</h1><p className="text-sm text-muted mt-1">Administrator access only.</p></div>
          {serverError && <p role="alert" className="text-sm text-danger rounded-ctl bg-danger/10 p-3">{serverError}</p>}
          <Input label="Email" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" loading={isSubmitting}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
