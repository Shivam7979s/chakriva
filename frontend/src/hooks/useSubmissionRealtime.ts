import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { Submission, SubmissionVerdict } from '@/types';
import { getSubmission, subscribeToMockSubmission } from '@/lib/submissionService';

export interface UseSubmissionRealtimeResult {
  submission: Submission | null;
  verdict: SubmissionVerdict | 'idle';
  isPending: boolean;
  isRunning: boolean;
  isCompleted: boolean;
}

export function useSubmissionRealtime(submissionId: string | null): UseSubmissionRealtimeResult {
  const [submission, setSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setSubmission(null);
      return;
    }

    let isMounted = true;

    // Fetch initial submission state
    getSubmission(submissionId)
      .then((initial) => {
        if (isMounted && initial) {
          setSubmission(initial);
        }
      })
      .catch(() => {
        // Safe fallback: Realtime subscription or subsequent polling will update state
      });

    // Always listen to mock/in-memory events
    const unsubMock = subscribeToMockSubmission(submissionId, (updated) => {
      if (isMounted) {
        setSubmission(updated);
      }
    });

    // If Supabase is configured, subscribe to Postgres Realtime changes
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (isSupabaseConfigured()) {
      channel = supabase
        .channel(`submission-${submissionId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'submissions',
            filter: `id=eq.${submissionId}`,
          },
          (payload) => {
            if (isMounted && payload.new) {
              setSubmission(payload.new as Submission);
            }
          }
        )
        .subscribe();
    }

    return () => {
      isMounted = false;
      unsubMock();
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [submissionId]);

  const verdict = submission ? submission.verdict : 'idle';
  const isPending = verdict === 'pending';
  const isRunning = verdict === 'running';
  const isCompleted = submission !== null && !isPending && !isRunning && verdict !== 'idle';

  return {
    submission,
    verdict,
    isPending,
    isRunning,
    isCompleted,
  };
}
