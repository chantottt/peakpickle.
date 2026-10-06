import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { api, errorMessage } from '../services/api';
import { Brand } from '../components/layout/Brand';
import { Button, Card, Field, FormError, Input } from '../components/ui';
export function AuthPage({ signup = false }: { signup?: boolean }) {
  const { account, loading, restore } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (loading) return <p role="status">Loading session…</p>;
  if (account) return <Navigate to={`/${account.role}/dashboard`} replace />;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const input = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api.post(`/auth/${signup ? 'signup' : 'login'}`, input);
      const user = await restore();
      if (user) navigate(`/${user.role}/dashboard`, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page-content" style={{ maxWidth: 480, margin: '50px auto' }}>
      <Brand />
      <h1>{signup ? 'Join PeakPickle' : 'Log in'}</h1>
      <Card>
        <form onSubmit={submit}>
          {signup && (
            <Field label="Name">
              <Input name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </Field>
          )}
          <Field label="Email">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              name="password"
              type="password"
              required
              minLength={12}
              maxLength={128}
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </Field>
          <p className="muted">Use at least 12 characters. Sessions last one hour.</p>
          <FormError message={error} />
          <Button type="submit" busy={busy}>
            {signup ? 'Create member account' : 'Log in'}
          </Button>
        </form>
      </Card>
      <Link to={signup ? '/login' : '/signup'}>
        {signup ? 'Already have an account? Log in' : 'Create a member account'}
      </Link>
      <p>
        <Link to="/">Back to PeakPickle</Link>
      </p>
    </main>
  );
}
