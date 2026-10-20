'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Grow, LinkButton, TextInput } from '@portrait/ui';
import { supabaseBrowser } from '@/lib/supabase/client';

type Step = 'choose' | 'email' | 'code';

/** S04 F5, at full size: Google, or a one-time sign-in link by email. The draft comes along either way. */
export function Login({ next, linkFailed, configured }: { next: string; linkFailed: boolean; configured: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkFailed ? 'That sign-in link didn’t work or has expired. Try again.' : '');
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const sentNote = useRef<HTMLParagraphElement>(null);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const google = async () => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback() } });
    // On success the browser is already on its way to Google.
    if (e) {
      setBusy(false);
      setError('Google sign-in didn’t start. Try again, or use a code by email.');
    }
  };

  const sendCode = async (ev?: FormEvent) => {
    ev?.preventDefault();
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('That address is missing something. Check it and try again.');
      emailInput.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: true, emailRedirectTo: callback() },
    });
    setBusy(false);
    if (e) {
      setError(e.status === 429 ? 'Too many sign-in emails asked for. Wait a minute, then try again.' : 'The email didn’t send. Try again.');
      return;
    }
    setStep('code');
    requestAnimationFrame(() => sentNote.current?.focus());
  };

  const verify = async (ev: FormEvent) => {
    ev.preventDefault();
    const supabase = supabaseBrowser();
    if (!supabase) return;
    const token = code.replace(/\D/g, '');
    if (token.length < 6) {
      setError('The code is the digits in the email.');
      codeInput.current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'email' });
    if (e) {
      setBusy(false);
      setError('That code didn’t match, or it has expired. Check it, or send a new one.');
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="panel flex flex-col gap-3 px-6 pt-6 pb-5">
      <h1 className="t-h3">Claim your portrait</h1>
      <p className="t-s c2">Your chat and draft come with you.</p>

      {!configured ? (
        <p className="help" role="status">
          Sign-in isn’t set up on this deployment yet.
        </p>
      ) : null}

      {step !== 'code' ? (
        <>
          <Button variant="wall" onClick={google} disabled={!configured || busy}>
            Continue with Google
          </Button>
          {step === 'choose' ? (
            <Button
              variant="quiet"
              size="sm"
              className="self-center"
              disabled={!configured}
              onClick={() => {
                setStep('email');
                requestAnimationFrame(() => emailInput.current?.focus());
              }}
            >
              Email me a sign-in link
            </Button>
          ) : null}
          <Grow open={step === 'email'}>
            <form className="fl pt-1" onSubmit={sendCode} noValidate>
              <label htmlFor="login-email" className="text-[14px] font-bold">
                Email
              </label>
              <TextInput
                ref={emailInput}
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                invalid={!!error}
                aria-describedby={error ? 'login-err' : 'login-help'}
              />
              <span id="login-help" className="help">
                We’ll email you a sign-in link. No password.
              </span>
              <Button type="submit" className="mt-1" disabled={busy}>
                Email me a sign-in link
              </Button>
            </form>
          </Grow>
        </>
      ) : (
        <div className="fl">
          {/* Supabase's built-in mailer sends a link; once the project has its own SMTP the
              template can add a code ({{ .Token }}), which the field below already accepts. */}
          <p ref={sentNote} tabIndex={-1} className="t-s" role="status">
            We sent a sign-in link to <b>{email.trim()}</b>. Open it in this browser to finish.
          </p>
          <p className="t-xs c2">It can be used once and expires soon. Check spam if it isn’t there in a minute.</p>
          <p className="t-xs c2 mt-1">
            <LinkButton onClick={() => sendCode()} disabled={busy}>
              Send a new link
            </LinkButton>{' '}
            ·{' '}
            <LinkButton
              onClick={() => {
                setStep('email');
                setCode('');
                setShowCode(false);
                setError('');
                requestAnimationFrame(() => emailInput.current?.focus());
              }}
            >
              Use a different email
            </LinkButton>{' '}
            ·{' '}
            <LinkButton
              aria-expanded={showCode}
              onClick={() => {
                setShowCode((v) => !v);
                requestAnimationFrame(() => codeInput.current?.focus());
              }}
            >
              The email has a code
            </LinkButton>
          </p>
          <Grow open={showCode}>
            <form className="fl pt-2" onSubmit={verify} noValidate>
              <label htmlFor="login-code" className="text-[14px] font-bold">
                Code
              </label>
              <TextInput
                ref={codeInput}
                id="login-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                invalid={!!error}
                aria-describedby={error ? 'login-err' : undefined}
                className="num text-[20px] tracking-[0.2em]"
              />
              <Button type="submit" className="mt-1" disabled={busy}>
                Sign in
              </Button>
            </form>
          </Grow>
        </div>
      )}

      {error ? (
        <p id="login-err" className="err" role="alert">
          {error}
        </p>
      ) : null}

      <p className="t-xs c3 mt-1">New here? The same steps make your account. Nothing is public until you publish.</p>
    </div>
  );
}
