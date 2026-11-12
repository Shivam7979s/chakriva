import { DSA_AND_SYSTEM_TRACKS } from './dsaSystemTracks.ts';
import { CORE_CS_AND_MASTERCLASS_TRACKS } from './coreCsMasterclassTracks.ts';
import type {
  LearnTrack,
  LearnLesson,
  LearnTrackCategory,
  LearnModuleGroup,
} from '../types/learn';
import type { SubjectId } from '@/features/roadmap/types/adaptive';

export const LEARN_TRACKS: LearnTrack[] = [
  ...DSA_AND_SYSTEM_TRACKS,
  ...CORE_CS_AND_MASTERCLASS_TRACKS,
];

export interface PrepHubCategoryTab {
  id: LearnTrackCategory;
  querySlug: string;
  label: string;
}

export const PREP_HUB_TABS: PrepHubCategoryTab[] = [
  { id: 'dsa', querySlug: 'dsa', label: 'DSA' },
  { id: 'core_cs', querySlug: 'core-cs', label: 'Core CS' },
  { id: 'system_design', querySlug: 'system-design', label: 'System Design' },
  { id: 'data_sql', querySlug: 'data-sql', label: 'Data & SQL' },
  { id: 'systems_labs', querySlug: 'systems-labs', label: 'Systems Labs' },
];

export const LEARN_CATEGORY_LABELS: Record<LearnTrackCategory, string> = {
  dsa: 'DSA',
  core_cs: 'Core CS',
  system_design: 'System Design',
  data_sql: 'Data & SQL',
  systems_labs: 'Systems Labs',
};

export function resolveCategoryFromQuery(openParam?: string | null): LearnTrackCategory {
  if (!openParam) return 'dsa';
  const match = PREP_HUB_TABS.find(
    (t) => t.querySlug === openParam || t.id === openParam
  );
  return match ? match.id : 'dsa';
}

export function getQuerySlugForCategory(cat: LearnTrackCategory): string {
  return PREP_HUB_TABS.find((t) => t.id === cat)?.querySlug || 'dsa';
}

export function getLearnTrackBySlug(slug?: string): LearnTrack | undefined {
  if (!slug) return undefined;
  return LEARN_TRACKS.find((t) => t.slug === slug || t.id === slug);
}

export function getLearnTrackBySubjectId(subjectId?: SubjectId): LearnTrack | undefined {
  if (!subjectId) return undefined;
  const direct = LEARN_TRACKS.find((t) => t.subjectId === subjectId);
  if (direct) return direct;
  if (subjectId === 'cs_fundamentals') return getLearnTrackBySlug('core-cs-interview-revision');
  if (subjectId === 'aptitude') return getLearnTrackBySlug('dsa-patterns');
  return undefined;
}

export function getLessonInTrack(
  track: LearnTrack,
  lessonSlug?: string
): LearnLesson {
  if (!lessonSlug) return track.lessons[0];
  return (
    track.lessons.find((l) => l.slug === lessonSlug || l.id === lessonSlug) ||
    track.lessons[0]
  );
}

export function groupTrackModules(track: LearnTrack): LearnModuleGroup[] {
  const groups = new Map<string, LearnLesson[]>();
  for (const lesson of track.lessons) {
    const title = lesson.moduleTitle || 'Core Curriculum';
    const existing = groups.get(title) || [];
    existing.push(lesson);
    groups.set(title, existing);
  }
  return Array.from(groups.entries()).map(([title, lessons], idx) => ({
    id: `${track.slug}-mod-${idx + 1}`,
    title,
    lessons,
  }));
}

export function formatMinutesLabel(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
