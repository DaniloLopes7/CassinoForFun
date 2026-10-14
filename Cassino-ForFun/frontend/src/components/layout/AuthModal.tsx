import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleLogin } from '@react-oauth/google';
import { api } from '../../services/api';
import { useUser } from '../../context/UserContext';

type Mode = 'login' | 'register' | 'googleUser';

const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export default function AuthModal() {
  const { t } = useTranslation();
  const { authOpen, setAuthOpen, onLogin } = useUser();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authOpen) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = mode === 'login' ? { email, password } : { username, email, password };
      const { data } = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, payload);
      onLogin(data.token, data.user);
    } catch (err: any) {
      setError(t(`auth.errors.${err.response?.data?.error || 'server_error'}`));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
      <div className="dbet-card w-full max-w-sm p-6 animate-pop">
        <h2 className="mb-1 text-center font-display text-3xl text-gold">DBET</h2>
        <p className="mb-4 text-center text-xs text-ink-muted">{t('auth.fictionalNotice')}</p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode !== 'login' && (
            <div>
              <label className="dbet-label" htmlFor="auth-username">
                {t('auth.username')}
              </label>
              <input id="auth-username" className="dbet-input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
          )}
          <div>
            <label className="dbet-label" htmlFor="auth-email">
              {t('auth.email')}
            </label>
            <input id="auth-email" type="email" className="dbet-input mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="dbet-label" htmlFor="auth-password">
              {t('auth.password')}
            </label>
            <input id="auth-password" type="password" className="dbet-input mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button className="dbet-btn-gold w-full" disabled={busy} type="submit">
            {mode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>

        {googleEnabled && (
          <div className="mt-3 flex flex-col items-center gap-2">
            <GoogleLogin
              theme="filled_black"
              shape="pill"
              onSuccess={async (resp) => {
                if (!resp.credential) return;
                try {
                  // Primeiro acesso pode exigir escolha de username (backend responde 428)
                  const payload = mode === 'register' ? { credential: resp.credential, username } : { credential: resp.credential };
                  const { data } = await api.post('/auth/google', payload);
                  onLogin(data.token, data.user);
                } catch (err: any) {
                  if (err.response?.status === 428) {
                    setMode('register');
                    setError(t('auth.errors.username_required'));
                  } else {
                    setError(t(`auth.errors.${err.response?.data?.error || 'server_error'}`));
                  }
                }
              }}
              onError={() => setError(t('auth.errors.server_error'))}
            />
          </div>
        )}

        <div className="mt-3 flex justify-between text-sm">
          <button className="text-ink-muted hover:text-gold" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? t('auth.createAccount') : t('auth.haveAccount')}
          </button>
          <button className="text-ink-faint hover:text-ink" onClick={() => setAuthOpen(false)}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
