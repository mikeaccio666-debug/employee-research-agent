'use client';

import { useEffect, useId, useState, useTransition, type FormEvent } from 'react';
import { Button, TextInput, cx } from '@portrait/ui';
import { handleProblem, normalizeHandle } from '@/lib/account';
import { claimHandle } from '@/lib/account-actions';

/**
 * "Your link": claim or change the handle behind {domain}/@handle. Format problems show as you
 * type; whether someone else has it is only known when saving (handles of others aren't readable).
 */
export function HandleField({
  initial,
  onSaved,
  className,
}: {
  initial: string | null;
  onSaved?: (handle: string) => void;
  className?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial ?? '');
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, startTransition] = useTransition();
  // The domain people will actually share; known only in the browser.
  const [host, setHost] = useState('');
  useEffect(() => setHost(window.location.host), []);

  const handle = normalizeHandle(value);
  const unchanged = handle === saved;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (unchanged) return;
    const problem = handleProblem(handle);
    if (problem) {
      setError(problem);
      return;
    }
    startTransition(async () => {
      const result = await claimHandle(handle);
      if (result.ok) {
        setSaved(result.handle);
        setValue(result.handle);
        setError('');
        setNote(saved ? 'Saved. Your old link stops working.' : 'It’s yours.');
        onSaved?.(result.handle);
      } else {
        setError(result.error);
        setNote('');
      }
    });
  };

  return (
    <form className={cx('fl', className)} onSubmit={submit} noValidate>
      <label htmlFor={id} className="text-[14px] font-bold">
        Your link
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-s c2" aria-hidden="true">
          {host}/@
        </span>
        <TextInput
          id={id}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
            setNote('');
          }}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={31}
          placeholder="your-name"
          invalid={!!error}
          aria-describedby={`${id}-note`}
          className="w-[16ch] min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={busy || unchanged || !handle}>
          {saved ? 'Change' : 'Claim'}
        </Button>
      </div>
      {error ? (
        <span id={`${id}-note`} className="err" role="alert">
          {error}
        </span>
      ) : (
        <span id={`${id}-note`} className="help" role="status">
          {note || 'Lowercase letters, numbers and hyphens.'}
        </span>
      )}
    </form>
  );
}
