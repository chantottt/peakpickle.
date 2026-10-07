import { useEffect, useId, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Eye,
  EyeOff,
  ListOrdered,
  LoaderCircle,
  Users,
} from 'lucide-react';
import { useAuth } from '../auth';
import { api, errorMessage } from '../services/api';
import { authSchema, type AuthFormValues } from '../schemas/forms';
import { Brand } from '../components/layout/Brand';
import { Button, Field, FormError, Input } from '../components/ui';
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const { account, loading, restore } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(
      signup
        ? authSchema.refine((value) => !!value.name && value.name.length >= 2, {
            path: ['name'],
            message: 'Enter at least 2 characters.',
          })
        : authSchema,
    ),
    defaultValues: { name: '', email: '', password: '' },
  });
  const requestedPath = (location.state as { from?: unknown } | null)?.from;
  const destination = (role: 'admin' | 'member') =>
    typeof requestedPath === 'string' &&
    /^\/(?!\/)/.test(requestedPath) &&
    !/^\/(login|signup)(\/|\?|#|$)/.test(requestedPath)
      ? requestedPath
      : `/${role}/dashboard`;

  useEffect(() => {
    reset({ name: '', email: '', password: '' });
    setShowPassword(false);
  }, [signup, reset]);

  if (loading)
    return (
      <main className="auth-loading" role="status">
        <LoaderCircle className="spin" size={22} aria-hidden="true" />
        Loading your session…
      </main>
    );
  if (account) return <Navigate to={destination(account.role)} replace />;
  const submit = async ({ name, ...credentials }: AuthFormValues) => {
    try {
      await api.post(
        `/auth/${signup ? 'signup' : 'login'}`,
        signup ? { ...credentials, name } : credentials,
      );
      const user = await restore();
      if (user) navigate(destination(user.role), { replace: true });
      else
        setError('root', {
          message: 'We could not load your session. Please try logging in again.',
        });
    } catch (cause) {
      setError('root', { message: errorMessage(cause) });
    }
  };
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <Link className="auth-back-link" to="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to home
        </Link>
      </header>
      <main className="auth-main">
        <div className="auth-card">
          <aside className="auth-story" aria-label="Play with PeakPickle">
            <img className="auth-story-photo" src="/pickleball-courts.jpg" alt="" />
            <span className="auth-story-eyebrow">
              <span /> MORE PLAY. LESS WAIT.
            </span>
            <div className="auth-story-content">
              <h2>
                Your court.
                <br />
                Your community.
                <br />
                <span>Your next game.</span>
              </h2>
              <p>A place to play, connect, and make every match count.</p>
              <ul className="auth-benefits">
                <li>
                  <CalendarDays size={18} aria-hidden="true" /> Book your favorite court
                </li>
                <li>
                  <ListOrdered size={18} aria-hidden="true" /> Join the queue, skip the guesswork
                </li>
                <li>
                  <Users size={18} aria-hidden="true" /> Find your people on the court
                </li>
              </ul>
            </div>
            <span className="auth-story-footer">GOOD GAMES. GREAT COMPANY.</span>
          </aside>
          <section className="auth-form-panel" aria-labelledby="auth-title">
            <div className="auth-form-heading">
              <p className="eyebrow">
                {signup ? 'YOUR NEXT CHAPTER STARTS HERE' : 'BACK IN THE GAME'}
              </p>
              <h1 id="auth-title">{signup ? 'Join PeakPickle.' : 'Welcome back.'}</h1>
              <p>
                {signup
                  ? 'Create your member account and make your next move.'
                  : 'Log in to your account. Your next game is waiting.'}
              </p>
            </div>
            <form
              className="auth-form"
              key={signup ? 'signup' : 'login'}
              noValidate
              onSubmit={handleSubmit(submit)}
              aria-busy={isSubmitting}
            >
              {signup && (
                <Field label="Name" error={errors.name?.message}>
                  <Input
                    {...register('name')}
                    placeholder="Your full name"
                    required
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                </Field>
              )}
              <Field label="Email" error={errors.email?.message}>
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={isSubmitting}
                />
              </Field>
              <div className={`field ${errors.password ? 'field-invalid' : ''}`}>
                <label htmlFor={passwordId}>Password</label>
                <div className="auth-password-control">
                  <Input
                    id={passwordId}
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={signup ? 'Create a password' : 'Enter your password'}
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password
                        ? `${passwordId}-error`
                        : signup
                          ? `${passwordId}-hint`
                          : undefined
                    }
                    disabled={isSubmitting}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff size={19} aria-hidden="true" />
                    ) : (
                      <Eye size={19} aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password ? (
                  <small id={`${passwordId}-error`} className="field-error" role="alert">
                    {errors.password.message}
                  </small>
                ) : (
                  signup && (
                    <small id={`${passwordId}-hint`} className="muted">
                      Use at least 12 characters for your password.
                    </small>
                  )
                )}
              </div>
              <FormError message={errors.root?.message} />
              <Button className="auth-submit" type="submit" busy={isSubmitting}>
                {isSubmitting
                  ? signup
                    ? 'Creating your account…'
                    : 'Logging in…'
                  : signup
                    ? 'Create member account'
                    : 'Log in'}
                {!isSubmitting && <ArrowRight size={18} aria-hidden="true" />}
              </Button>
            </form>
            <p className="auth-switch">
              {signup ? 'Already part of the club?' : 'New to PeakPickle?'}{' '}
              <Link to={signup ? '/login' : '/signup'} state={location.state}>
                {signup ? 'Log in' : 'Create an account'}{' '}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </p>
          </section>
        </div>
        <p className="auth-page-footer">Your Court. Your Match. Your Turn.</p>
      </main>
    </div>
  );
}
