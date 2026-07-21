'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  joinChapterAction,
  listJoinableChaptersAction,
  startPatientVerificationAction,
  verifyPatientCodeAction,
} from '@/domains/join/actions';
import type { CommunityChapter } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CHAPTER_TYPE_LABELS } from '@/constants/chapter-types';

type Step = 'patient-id' | 'verify' | 'chapter' | 'complete';

export function JoinForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('patient-id');
  const [pending, startTransition] = useTransition();
  const [patientId, setPatientId] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [code, setCode] = useState('');
  const [query, setQuery] = useState('');
  const [chapters, setChapters] = useState<CommunityChapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [joinedChapterName, setJoinedChapterName] = useState('');

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === selectedChapterId) ?? null,
    [chapters, selectedChapterId],
  );

  const startVerification = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('patient_id', patientId);
        const result = await startPatientVerificationAction(formData);
        setVerificationId(result.verificationId);
        setMaskedEmail(result.maskedEmail);
        setDisplayCode(result.displayCode);
        setCode('');
        setStep('verify');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not verify Patient ID');
      }
    });
  };

  const verifyCode = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('verification_id', verificationId);
        formData.set('code', code);
        await verifyPatientCodeAction(formData);
        const availableChapters = await listJoinableChaptersAction();
        setChapters(availableChapters);
        setStep('chapter');
        toast.success('CareMate account verified');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not verify code');
      }
    });
  };

  const searchChapters = () => {
    startTransition(async () => {
      try {
        setChapters(await listJoinableChaptersAction(query));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not search chapters');
      }
    });
  };

  const joinChapter = () => {
    if (!selectedChapterId) return;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set('chapter_id', selectedChapterId);
        const result = await joinChapterAction(formData);
        setJoinedChapterName(result.chapterName);
        setStep('complete');
        toast.success(`You joined ${result.chapterName}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not join chapter');
      }
    });
  };

  const stepNumber =
    step === 'patient-id' ? 1 : step === 'verify' ? 2 : step === 'chapter' ? 3 : 4;

  return (
    <Card className="w-full max-w-lg border-border shadow-card">
      <CardHeader>
        <CardTitle className="text-brand-navy">Join CareMate Community</CardTitle>
        <CardDescription>
          Verify your existing CareMate account, then select an available chapter.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className={`h-1.5 flex-1 rounded-full ${
                item <= stepNumber ? 'bg-primary' : 'bg-surface-muted'
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {step === 'patient-id' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="patient_id">CareMate Patient ID</Label>
              <Input
                id="patient_id"
                inputMode="numeric"
                maxLength={12}
                placeholder="12-digit Patient ID"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value.replace(/\D/g, ''))}
              />
              <p className="text-xs text-muted">
                Community membership is available only to registered CareMate app users.
              </p>
            </div>
            <Button
              className="w-full"
              disabled={pending || patientId.length !== 12}
              loading={pending}
              loadingLabel="Checking…"
              onClick={startVerification}
            >
              Send verification code
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-muted">
              We sent a code to <span className="font-medium text-foreground">{maskedEmail}</span>.
            </p>
            <div className="rounded-lg border border-primary/30 bg-primary-light/40 p-4 text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Temporary displayed code
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.3em] text-brand-navy">
                {displayCode}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="verification_code">Verification code</Label>
              <Input
                id="verification_code"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button
              className="w-full"
              disabled={pending || code.length !== 6}
              loading={pending}
              loadingLabel="Verifying…"
              onClick={verifyCode}
            >
              Verify code
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              disabled={pending}
              onClick={() => setStep('patient-id')}
            >
              Use another Patient ID
            </Button>
          </>
        )}

        {step === 'chapter' && (
          <>
            <div className="flex gap-2">
              <Input
                placeholder="Search available chapters"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    searchChapters();
                  }
                }}
              />
              <Button
                variant="secondary"
                loading={pending}
                loadingLabel="Searching…"
                onClick={searchChapters}
              >
                Search
              </Button>
            </div>
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                      selectedChapterId === chapter.id
                        ? 'border-primary bg-primary-light/50'
                        : 'border-border hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{chapter.name}</p>
                      <Badge variant="secondary">
                        {CHAPTER_TYPE_LABELS[chapter.chapter_type]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {[
                        chapter.country_code,
                        ...Object.values(chapter.administrative_hierarchy ?? {}),
                      ].join(' · ')}{' '}
                      · {chapter.member_count} members
                    </p>
                  </button>
                </li>
              ))}
              {chapters.length === 0 && (
                <li className="py-6 text-center text-sm text-muted">
                  No active chapters are available yet. Please check back after an admin creates one.
                </li>
              )}
            </ul>
            <Button
              className="w-full"
              disabled={pending || !selectedChapter}
              loading={pending}
              loadingLabel="Joining…"
              onClick={joinChapter}
            >
              Join {selectedChapter?.name ?? 'chapter'}
            </Button>
          </>
        )}

        {step === 'complete' && (
          <div className="space-y-4 text-center">
            <p className="text-sm text-foreground">
              You are now a member of <strong>{joinedChapterName}</strong>.
            </p>
            <p className="text-xs text-muted">
              Sign in with the same CareMate account credentials to enter the community portal.
            </p>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Continue to sign in
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
