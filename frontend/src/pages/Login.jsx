import React, { useState } from 'react';
import AnimatedPage from '../components/AnimatedPage';
import Card from '../components/Card';
import Button from '../components/Button';
import { toast } from 'sonner';
import { api } from '../services/api';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function Login({ setToken }) {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const redirect = search.get('redirect') || '/';

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      setLoading(true);
      let res;
      if (mode === 'register') {
        res = await api.auth.register(email, password);
        toast.success('Account created successfully');
      } else {
        res = await api.auth.login(email, password);
      }
      if (res.success) {
        setToken(res.accessToken);
        localStorage.setItem('token', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        toast.success('Logged in');
        navigate(redirect, { replace: true });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-background">
      <div className="absolute inset-0 bg-grid-slate bg-grid-16 opacity-30 dark:opacity-10 pointer-events-none" />
      <AnimatedPage>
        <div className="max-w-md mx-auto pt-16">
          <div className="glass rounded-xl p-6">
          <h2 className="text-2xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Use your email and password.</p>
          <form className="mt-6 grid gap-3" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
              <input
                className="h-11 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Email"
                type="email"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
            </div>
            <div>
              <input
                className="h-11 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && <p className="mt-1 text-xs text-rose-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" disabled={loading}>{loading ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Create account')}</Button>
          </form>
          <button
            type="button"
            className="mt-2 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            Switch to {mode === 'login' ? 'Register' : 'Login'}
          </button>
          </div>
        </div>
      </AnimatedPage>
    </div>
  );
}
