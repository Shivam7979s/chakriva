import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { ConfidenceLevel } from '@/types';
import { FALLBACK_PROBLEMS } from '@/lib/curriculumData';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Closed-Loop Telemetry Feedback:
 * When a user achieves an Accepted submission, dynamically:
 * 1. Mark corresponding tasks in public.sprint_tasks as completed.
 * 2. Recalculate and elevate topic mastery in public.user_diagnostics.
 */
export async function syncAcceptedSubmissionToSprintAndDiagnostics(
  userId: string,
  problemId: string,
  difficulty: string = 'medium'
): Promise<void> {
  if (!isSupabaseConfigured() || !userId || !problemId) return;

  try {
    const nowIso = new Date().toISOString();

    // Resolve authoritative UUID for database column compatibility
    let resolvedUuid = problemId;
    if (!UUID_REGEX.test(problemId)) {
      const { data: pData } = await supabase
        .from('problems')
        .select('id')
        .or(`verniq_id.eq.${problemId},slug.eq.${problemId}`)
        .maybeSingle();
      if (pData?.id && UUID_REGEX.test(pData.id)) {
        resolvedUuid = pData.id;
      } else {
        resolvedUuid = '';
      }
    }

    // 1. Mark matching tasks in public.sprint_tasks as completed (only when authoritative UUID exists)
    if (resolvedUuid && UUID_REGEX.test(resolvedUuid)) {
      await supabase
        .from('sprint_tasks')
        .update({
          is_completed: true,
          completed_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('problem_id', resolvedUuid);
    }

    // 2. Identify problem category tag
    const matchedProblem = FALLBACK_PROBLEMS.find(
      (p) => p.id === resolvedUuid || p.verniq_id === problemId || p.slug === problemId
    );
    const tags = matchedProblem?.tags || ['Arrays'];
    const primaryTag = tags[0] || 'Arrays';

    // 3. Compute mastery score increment based on problem difficulty
    const increment = difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5;

    // 4. Query current diagnostic for this user & tag
    const { data: existingDiag, error: diagErr } = await supabase
      .from('user_diagnostics')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_name', primaryTag)
      .maybeSingle();

    if (!diagErr) {
      const currentScore = existingDiag ? Number(existingDiag.mastery_score) : 40;
      const newScore = Math.min(100, Math.round(currentScore + increment));

      let confidence: ConfidenceLevel = 'novice';
      if (newScore >= 80) confidence = 'proficient';
      else if (newScore >= 50) confidence = 'intermediate';

      await supabase.from('user_diagnostics').upsert(
        {
          user_id: userId,
          tag_name: primaryTag,
          mastery_score: newScore,
          confidence_level: confidence,
          evaluated_at: nowIso,
        },
        { onConflict: 'user_id,tag_name' }
      );
    }
  } catch (err) {
    console.error('[TelemetryFeedback] Error synchronizing submission:', err);
  }
}
