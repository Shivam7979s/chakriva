import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  RotateCcw,
  X,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Zap,
  Sparkles,
  Loader2,
  Info,
  Check,
  Circle,
  GitBranch,
  Copy,
} from 'lucide-react';
import type {
  RoadmapGoal,
  CompanyTargetType,
  TargetRegion,
  ExperienceLevel,
  SubjectId,
  SubjectProficiency,
  StartDateOption,
  RoadmapWizardDraft,
  WeeklyAvailability,
  DayOfWeek,
} from '../types/adaptive';
import {
  resolveDraftStartDate,
  generatePersonalizedRoadmap,
  getCatalogProblemsByTopic,
} from '../utils/adaptiveEngine';
import { resolveGoalToSkills, type GoalInterpretationPlan } from '../utils/goalSkillMapper';
import { assessSkillGaps } from '../utils/skillGapEngine';
import { buildTopologicalCurriculum } from '../utils/curriculumPlanner';
import { calculateHonestFeasibility } from '../utils/scheduleOptimizer';
import { getSubjectMeta } from '../utils/subjectCatalog';
import { adaptiveRoadmapService } from '../services/adaptiveRoadmapService';
import { useUserProgress } from '@/hooks/useUserProgress';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/actions/Button';
import { cn } from '@/lib/utils';

export interface RoadmapCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

const DEFAULT_AVAILABILITY: WeeklyAvailability = {
  mon: 2,
  tue: 2,
  wed: 2,
  thu: 2,
  fri: 2,
  sat: 4,
  sun: 0,
};

const DEFAULT_DRAFT: RoadmapWizardDraft = {
  planName: '',
  experienceLevel: '0_2',
  goal: 'coding_interview',
  customGoalText: '',
  companyTargetType: 'product_based',
  targetRegion: 'india',
  targetCompanies: ['Google', 'Amazon'],
  targetRole: 'Software Engineer',
  selectedSubjects: ['dsa'],
  subjectProficiencies: { dsa: 'intermediate' },
  selectedTopics: [],
  skillLevel: 'intermediate',
  primaryLanguage: 'java',
  topicComfort: {},
  approxProblemsSolved: 25,
  inferredFromActivity: false,
  biggestChallenge: 'patterns',
  targetDeadline: new Date(Date.now() + 8 * 7 * 86400000).toISOString().split('T')[0],
  timelineWeeks: 8,
  isFlexibleTimeline: false,
  weeklyAvailability: DEFAULT_AVAILABILITY,
  studyDaysPerWeek: 6,
  sessionPreference: 'shorter_daily',
  learningStyle: 'balanced',
  revisionFrequency: 'weekly',
  includeTimedPractice: true,
  includeMockInterviews: false,
  struggleTopics: ['Dynamic Programming'],
  masteredTopics: [],
  pacing: 'balanced',
  startDateOption: 'today',
  customStartDate: new Date().toISOString().split('T')[0],
  personalizationMode: 'personalized',
};

const DAY_KEYS: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_NAMES: Record<DayOfWeek, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const ROLE_OPTIONS = [
  'SDE Intern',
  'Software Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Full Stack Engineer',
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: 'fresher', label: 'Student / Fresher' },
  { id: '0_2', label: '0 - 2 years' },
  { id: '2_5', label: '2 - 5 years' },
  { id: '5_plus', label: '5+ years' },
];

const COMPANY_TARGET_OPTIONS: { id: CompanyTargetType; label: string }[] = [
  { id: 'startups', label: 'Startups' },
  { id: 'faang_competitive', label: 'FAANG' },
  { id: 'product_based', label: 'All Product Based Companies' },
  { id: 'service_based', label: 'Service Based' },
  { id: 'open_to_all', label: 'Open to all' },
];

const REGION_OPTIONS: { id: TargetRegion; label: string }[] = [
  { id: 'india', label: 'India' },
  { id: 'us_europe', label: 'US / Europe / Others' },
];

const GOAL_OPTIONS: { id: RoadmapGoal; label: string }[] = [
  { id: 'internship', label: 'Internship Preparation' },
  { id: 'placement_prep', label: 'Placement Preparation' },
  { id: 'coding_interview', label: 'Switching Jobs' },
  { id: 'competitive_programming', label: 'Competitive Programming' },
  { id: 'dsa_fundamentals', label: 'Improve DSA Skills' },
];

const CORE_SUBJECT_IDS: SubjectId[] = ['dsa', 'oop', 'dbms', 'os', 'cn'];
const ADDITIONAL_SUBJECT_IDS: SubjectId[] = ['system_design', 'sql', 'cs_fundamentals', 'aptitude'];

const DSA_LEVEL_CHOICES: { id: SubjectProficiency; label: string }[] = [
  { id: 'not_started', label: 'Start from zero' },
  { id: 'beginner', label: 'DSA Foundations' },
  { id: 'intermediate', label: 'Pattern Mastery' },
  { id: 'advanced', label: 'Quick Revision' },
];

const GENERAL_LEVEL_CHOICES: { id: SubjectProficiency; label: string }[] = [
  { id: 'beginner', label: 'Learn in Depth' },
  { id: 'advanced', label: 'Interview Preparation' },
];

const LANGUAGE_OPTIONS = [
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'go', label: 'Go' },
];

const TIMELINE_OPTIONS = [
  { weeks: 4, label: '4 weeks' },
  { weeks: 8, label: '8 weeks' },
  { weeks: 12, label: '12 weeks' },
  { weeks: 16, label: '16 weeks' },
];

const STEP_TITLES: Record<number, string> = {
  1: 'About you',
  2: 'Build your preparation',
  3: 'Review your roadmap',
  4: 'Setup weekly availability',
  5: 'Finalise your plan',
};

const STEP_SUBTITLES: Record<number, string> = {
  1: 'Tell us your target role and background so we calibrate problem depth and milestones.',
  2: 'Select core & optional subjects and mark where you currently stand in each.',
  3: 'Inspect estimated hours and trim any topics you have already mastered.',
  4: 'Set realistic daily study hours across Monday to Sunday — zero-hour rest days welcome.',
  5: 'Preview sprint pacing week by week and launch your adaptive workspace.',
};

function formatHoursMinutes(totalMinutes: number): string {
  const hrs = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hrs <= 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

export const RoadmapCreationWizard: React.FC<RoadmapCreationWizardProps> = ({
  isOpen,
  onClose,
  onGenerated,
}) => {
  const [step, setStep] = useState<number>(1);
  const [draft, setDraft] = useState<RoadmapWizardDraft>(() => {
    const saved = adaptiveRoadmapService.getWizardDraft();
    return saved ? { ...DEFAULT_DRAFT, ...saved } : DEFAULT_DRAFT;
  });

  // Step 2 accordion open state (DSA open initially)
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({ dsa: true });
  // Step 3 tree expansion + skipped problems filter
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({ dsa: true });
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [removeMode, setRemoveMode] = useState<boolean>(false);
  // Step 5 preview state
  const [previewSprintIdx, setPreviewSprintIdx] = useState<number>(0);
  const [expandedPreviewDays, setExpandedPreviewDays] = useState<Record<string, boolean>>({
    '0-0': true,
  });

  const [aiPlan, setAiPlan] = useState<GoalInterpretationPlan | null>(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user } = useAuth();
  const { progressMap } = useUserProgress();

  const verifiedSolvedCount = useMemo(
    () => Object.values(progressMap).filter((s) => s === 'solved').length,
    [progressMap]
  );

  useEffect(() => {
    if (verifiedSolvedCount > 0 && !draft.inferredFromActivity) {
      setDraft((prev) => ({
        ...prev,
        approxProblemsSolved: verifiedSolvedCount,
        inferredFromActivity: true,
      }));
    }
  }, [verifiedSolvedCount, draft.inferredFromActivity]);

  useEffect(() => {
    adaptiveRoadmapService.saveWizardDraft(draft);
  }, [draft]);

  const runAiInterpret = async (forceDraft: RoadmapWizardDraft = draft) => {
    setIsInterpreting(true);
    try {
      const res = await adaptiveRoadmapService.interpretGoal(forceDraft);
      setAiPlan(res);
      setDraft((prev) => {
        if (prev.selectedTopics && prev.selectedTopics.length > 0) return prev;
        return {
          ...prev,
          selectedTopics: res.skillRequirements.map((r) => r.topic),
        };
      });
    } catch {
      const fallback = resolveGoalToSkills(forceDraft);
      setAiPlan(fallback);
    } finally {
      setIsInterpreting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || step !== 3) return;
    runAiInterpret(draft);
  }, [isOpen, step]);

  const selectedSubjects: SubjectId[] = draft.selectedSubjects?.length
    ? draft.selectedSubjects
    : ['dsa'];

  const effectiveGoalPlan = useMemo<GoalInterpretationPlan>(() => {
    const base = aiPlan || resolveGoalToSkills(draft);
    if (draft.selectedTopics && draft.selectedTopics.length > 0) {
      const selectedSet = new Set(draft.selectedTopics);
      const filtered = base.skillRequirements.filter((r) => selectedSet.has(r.topic));
      if (filtered.length > 0) {
        return { ...base, skillRequirements: filtered };
      }
    }
    return base;
  }, [aiPlan, draft]);

  const curriculumPreview = useMemo(() => {
    const gaps = assessSkillGaps(effectiveGoalPlan.skillRequirements, draft);
    const plan = buildTopologicalCurriculum(effectiveGoalPlan, gaps, draft.timelineWeeks);
    return { gaps, plan };
  }, [effectiveGoalPlan, draft]);

  const feasibility = useMemo(() => {
    return calculateHonestFeasibility(draft, curriculumPreview.plan);
  }, [draft, curriculumPreview.plan]);

  // Step 5 real deterministic Sprint/Day preview using generatePersonalizedRoadmap
  const finalizedPreviewPlan = useMemo(() => {
    if (step !== 5) return null;
    const startDateStr = resolveDraftStartDate(draft);
    return generatePersonalizedRoadmap(
      { ...draft, selectedSubjects, personalizationMode: 'personalized' },
      {
        startDate: startDateStr,
        goalSkills: effectiveGoalPlan,
        verifiedProgressMap: progressMap,
      }
    );
  }, [step, draft, selectedSubjects, effectiveGoalPlan, progressMap]);

  const totalWeeklyHours = DAY_KEYS.reduce(
    (sum, k) => sum + (draft.weeklyAvailability[k] || 0),
    0
  );

  // Total planned minutes across selected topics & subjects for Step 3 header
  const totalSubjectMinutes = useMemo(() => {
    let mins = 0;
    if (selectedSubjects.includes('dsa')) {
      for (const req of effectiveGoalPlan.skillRequirements) {
        const probs = getCatalogProblemsByTopic(req.topic);
        mins += probs.reduce((s, p) => s + (p.estimatedMinutes || 25), 0) + 25;
      }
    }
    for (const subId of selectedSubjects) {
      if (subId === 'dsa') continue;
      const meta = getSubjectMeta(subId);
      mins += (meta?.estimatedAdditionalHours || 4) * 60;
    }
    return Math.max(mins, 120);
  }, [selectedSubjects, effectiveGoalPlan]);

  const estDaysNeeded = useMemo(() => {
    const avgDaily = Math.max(1, totalWeeklyHours / 7);
    const daysFromHours = Math.ceil(totalSubjectMinutes / 60 / avgDaily);
    return Math.max(7, daysFromHours);
  }, [totalSubjectMinutes, totalWeeklyHours]);

  if (!isOpen) return null;

  const handleToggleSubject = (subId: SubjectId) => {
    setDraft((prev) => {
      const current = prev.selectedSubjects || ['dsa'];
      const exists = current.includes(subId);
      if (exists && current.length === 1) return prev; // Keep at least 1 subject
      const next = exists ? current.filter((s) => s !== subId) : [...current, subId];
      return {
        ...prev,
        selectedSubjects: next,
        subjectProficiencies: {
          ...(prev.subjectProficiencies || {}),
          [subId]: prev.subjectProficiencies?.[subId] || 'beginner',
        },
      };
    });
  };

  const handleSetSubjectLevel = (subId: SubjectId, level: SubjectProficiency) => {
    setDraft((prev) => {
      const nextSkill =
        subId === 'dsa'
          ? level === 'not_started'
            ? 'beginner'
            : level === 'beginner'
            ? 'basic_familiarity'
            : level === 'advanced'
            ? 'advanced'
            : 'intermediate'
          : prev.skillLevel;
      return {
        ...prev,
        skillLevel: nextSkill,
        selectedSubjects: (prev.selectedSubjects || []).includes(subId)
          ? prev.selectedSubjects
          : [...(prev.selectedSubjects || ['dsa']), subId],
        subjectProficiencies: {
          ...(prev.subjectProficiencies || {}),
          [subId]: level,
        },
      };
    });
  };

  const handleRemoveTopic = (topic: string) => {
    setDraft((prev) => {
      const baseList =
        prev.selectedTopics && prev.selectedTopics.length > 0
          ? prev.selectedTopics
          : (aiPlan || resolveGoalToSkills(prev)).skillRequirements.map((r) => r.topic);
      if (baseList.length <= 1) return prev;
      return {
        ...prev,
        selectedTopics: baseList.filter((t) => t !== topic),
      };
    });
  };

  const handleRestoreAllTopics = () => {
    const base = aiPlan || resolveGoalToSkills(draft);
    setDraft((prev) => ({
      ...prev,
      selectedTopics: base.skillRequirements.map((r) => r.topic),
      masteredTopics: [],
    }));
  };

  const handleUpdateAvailability = (day: DayOfWeek, hours: number) => {
    const clamped = Math.max(0, Math.min(12, hours));
    setDraft((prev) => {
      const updated = { ...prev.weeklyAvailability, [day]: clamped };
      const activeDays = DAY_KEYS.filter((k) => updated[k] > 0).length;
      return {
        ...prev,
        weeklyAvailability: updated,
        studyDaysPerWeek: activeDays,
      };
    });
  };

  const handleCopyMonToWeekdays = () => {
    const monHrs = draft.weeklyAvailability.mon ?? 2;
    setDraft((prev) => {
      const updated: WeeklyAvailability = {
        ...prev.weeklyAvailability,
        mon: monHrs,
        tue: monHrs,
        wed: monHrs,
        thu: monHrs,
        fri: monHrs,
      };
      return {
        ...prev,
        weeklyAvailability: updated,
        studyDaysPerWeek: DAY_KEYS.filter((k) => updated[k] > 0).length,
      };
    });
  };

  const handleDiscardPlan = () => {
    setDraft(DEFAULT_DRAFT);
    setAiPlan(null);
    adaptiveRoadmapService.clearWizardDraft();
    onClose();
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const defaultTitle =
        draft.planName?.trim() ||
        `${draft.targetRole || 'Software Engineer'} (${draft.timelineWeeks}w Plan)`;

      const finalDraft: RoadmapWizardDraft = {
        ...draft,
        planName: defaultTitle,
        selectedSubjects,
        personalizationMode: 'personalized',
      };

      const startDateStr = resolveDraftStartDate(finalDraft);

      await adaptiveRoadmapService.createNewServerRoadmap(
        finalDraft,
        user?.id,
        {
          mode: 'personalized',
          startDate: startDateStr,
          goalSkills: effectiveGoalPlan,
          verifiedProgressMap: progressMap,
        },
        Boolean(user)
      );

      onGenerated();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not generate roadmap. Please review your selections.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceedStep =
    step === 4 ? totalWeeklyHours > 0 : step === 2 ? selectedSubjects.length > 0 : true;

  const progressPercent = Math.round((step / 5) * 100);

  return (
    <div className="max-w-5xl mx-auto min-h-[78vh] flex flex-col justify-between py-2 sm:py-4 text-left text-[#F3F6FF]">
      <div>
        {/* Obsidian Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#7C8BA6]">
              <span className="px-2 py-0.5 rounded-full bg-[#152443] text-[#60A5FA] font-medium">
                Step {step} / 5
              </span>
              <span className="hidden sm:inline">CHAKRIVA Roadmap Architect</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={`header-${step}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F8FAFF]">
                  {STEP_TITLES[step]}
                </h1>
                <p className="text-xs sm:text-sm text-[#8592A8] mt-1">{STEP_SUBTITLES[step]}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDiscardPlan}
              className="px-3 py-1.5 rounded-lg border border-[#1B2234] bg-[#0F131D] text-xs text-[#94A1B8] hover:text-[#F3F6FF] hover:border-[#2B3754] transition-colors cursor-pointer"
            >
              Discard my plan
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg text-xs text-[#8592A8] hover:text-[#F3F6FF] hover:bg-[#131826] transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ================================================================ */}
          {/* STEP 1 OF 5: ABOUT YOU                                           */}
          {/* ================================================================ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-6 max-w-3xl"
            >
              {/* 1. Role */}
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#C3CEE0]">
                  1. Which role are you preparing for?
                  <span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map((role) => {
                    const selected = draft.targetRole === role;
                    return (
                      <motion.button
                        key={role}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDraft((p) => ({ ...p, targetRole: role }))}
                        className={cn(
                          'px-3.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer',
                          selected
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium shadow-[0_0_16px_rgba(59,130,246,0.14)]'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                        )}
                      >
                        {role}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Experience */}
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#C3CEE0]">
                  2. How much experience do you have?
                  <span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {EXPERIENCE_OPTIONS.map((exp) => {
                    const selected = draft.experienceLevel === exp.id;
                    return (
                      <motion.button
                        key={exp.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDraft((p) => ({ ...p, experienceLevel: exp.id }))}
                        className={cn(
                          'px-3.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer',
                          selected
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium shadow-[0_0_16px_rgba(59,130,246,0.14)]'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                        )}
                      >
                        {exp.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Target Companies */}
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#C3CEE0]">
                  3. What kind of interviews are you mainly targeting?
                  <span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_TARGET_OPTIONS.map((comp) => {
                    const selected = draft.companyTargetType === comp.id;
                    return (
                      <motion.button
                        key={comp.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            companyTargetType: comp.id,
                            targetCompanies:
                              comp.id === 'faang_competitive'
                                ? ['Google', 'Amazon', 'Meta']
                                : comp.id === 'startups'
                                ? ['Stripe', 'Uber']
                                : ['Google', 'Amazon', 'Atlassian'],
                          }))
                        }
                        className={cn(
                          'px-3.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer',
                          selected
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium shadow-[0_0_16px_rgba(59,130,246,0.14)]'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                        )}
                      >
                        {comp.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Target Region */}
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#C3CEE0]">
                  4. Which region are you preparing for?
                  <span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((reg) => {
                    const selected = draft.targetRegion === reg.id;
                    return (
                      <motion.button
                        key={reg.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDraft((p) => ({ ...p, targetRegion: reg.id }))}
                        className={cn(
                          'px-3.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer',
                          selected
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium shadow-[0_0_16px_rgba(59,130,246,0.14)]'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                        )}
                      >
                        {reg.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Primary Goal */}
              <div className="space-y-2.5">
                <label className="block text-sm font-medium text-[#C3CEE0]">
                  5. What is your primary goal?
                  <span className="text-[#EF4444] ml-0.5">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map((g) => {
                    const selected = draft.goal === g.id;
                    return (
                      <motion.button
                        key={g.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDraft((p) => ({ ...p, goal: g.id }))}
                        className={cn(
                          'px-3.5 py-2 rounded-lg text-xs border transition-colors cursor-pointer',
                          selected
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium shadow-[0_0_16px_rgba(59,130,246,0.14)]'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                        )}
                      >
                        {g.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 2 OF 5: BUILD YOUR PREPARATION                              */}
          {/* ================================================================ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase tracking-wider text-[#7C8BA6]">
                  Recommended Subjects
                </div>
              </div>

              {/* Stacked Accordion Subject Cards */}
              <div className="space-y-3">
                {CORE_SUBJECT_IDS.map((subId) => {
                  const meta = getSubjectMeta(subId);
                  if (!meta) return null;
                  const isSelected = selectedSubjects.includes(subId);
                  const isOpenAcc = Boolean(openSubjects[subId]);
                  const currentLevel =
                    draft.subjectProficiencies?.[subId] ||
                    (subId === 'dsa' ? 'intermediate' : 'beginner');
                  const levels = subId === 'dsa' ? DSA_LEVEL_CHOICES : GENERAL_LEVEL_CHOICES;

                  return (
                    <div
                      key={subId}
                      className={cn(
                        'rounded-xl border transition-colors overflow-hidden',
                        isSelected
                          ? 'bg-[#0F1420] border-[#222D45]'
                          : 'bg-[#0B0E16] border-[#171D2D]'
                      )}
                    >
                      <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleSubject(subId)}
                          className="flex items-center gap-3 cursor-pointer text-left"
                        >
                          <span
                            className={cn(
                              'w-4 h-4 rounded flex items-center justify-center border transition-colors',
                              isSelected
                                ? 'bg-[#3B82F6] border-[#3B82F6] text-white'
                                : 'border-[#2B3650] bg-[#0B0D13]'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span className="text-sm font-medium text-[#F3F6FF]">
                            {meta.shortLabel}
                          </span>
                          {meta.isJudgeBacked ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#152443] text-[#60A5FA] font-medium hidden sm:inline">
                              Judge-backed
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#7A879E] hidden sm:inline">
                              Study modules
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setOpenSubjects((prev) => ({ ...prev, [subId]: !prev[subId] }))
                          }
                          className="p-1.5 rounded-lg text-[#7C8BA6] hover:text-[#F3F6FF] hover:bg-[#171E30] transition-colors cursor-pointer"
                          aria-label={`Toggle ${meta.shortLabel} options`}
                        >
                          <motion.div
                            animate={{ rotate: isOpenAcc ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpenAcc && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-2.5 border-t border-[#171D2D] space-y-2.5">
                              <div className="text-xs text-[#8592A8]">
                                What&apos;s your current level?
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {levels.map((lvl) => {
                                  const active = isSelected && currentLevel === lvl.id;
                                  return (
                                    <motion.button
                                      key={lvl.id}
                                      type="button"
                                      whileTap={{ scale: 0.985 }}
                                      onClick={() => handleSetSubjectLevel(subId, lvl.id)}
                                      className={cn(
                                        'px-3.5 py-2.5 rounded-lg border text-xs flex items-center gap-2.5 text-left transition-colors cursor-pointer',
                                        active
                                          ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium'
                                          : 'bg-[#0B0E16] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5] hover:border-[#29344E]'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0',
                                          active ? 'border-[#3B82F6]' : 'border-[#2D3852]'
                                        )}
                                      >
                                        {active && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />
                                        )}
                                      </span>
                                      <span>{lvl.label}</span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-[#7C8BA6]">
                Recommended — We&apos;ve preselected these core subjects based on your role and goals.
                Add or remove subjects anytime.
              </p>

              {/* Other additional subjects */}
              <div className="space-y-2.5">
                <div className="text-xs font-medium text-[#A8B4CA]">Other additional subjects</div>
                <div className="flex flex-wrap gap-2">
                  {ADDITIONAL_SUBJECT_IDS.map((subId) => {
                    const meta = getSubjectMeta(subId);
                    if (!meta) return null;
                    const active = selectedSubjects.includes(subId);
                    return (
                      <motion.button
                        key={subId}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleToggleSubject(subId)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer',
                          active
                            ? 'bg-[#0E2828] border-[#00B8A3]/45 text-[#4FD1C5] font-medium'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5]'
                        )}
                      >
                        {active ? (
                          <Check className="w-3.5 h-3.5 text-[#00B8A3]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{meta.shortLabel}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Language + Target Duration compact row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#A8B4CA]">Preferred language</div>
                  <div className="flex flex-wrap gap-1.5">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, primaryLanguage: lang.id }))}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer',
                          draft.primaryLanguage === lang.id
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5]'
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#A8B4CA]">Target duration</div>
                  <div className="flex flex-wrap gap-1.5">
                    {TIMELINE_OPTIONS.map((t) => (
                      <button
                        key={t.weeks}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, timelineWeeks: t.weeks }))}
                        className={cn(
                          'px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer',
                          draft.timelineWeeks === t.weeks
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5]'
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Honest CHAKRIVA Scope Notice */}
              <div className="rounded-xl border border-[#1E2E4A] bg-[#0F182B] p-3.5 flex items-start gap-2.5 text-xs text-[#9AB0D1]">
                <Info className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#60A5FA] font-medium">Execution &amp; study tracks:</span>{' '}
                  DSA tasks map to verified CHAKRIVA coding problems with container judge grading.
                  System Design, OOP, DBMS, OS, and CN are scheduled as structured concept study
                  modules.
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 3 OF 5: REVIEW YOUR ROADMAP (2-Col Split Tree + Ask CHAKRIVA) */}
          {/* ================================================================ */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {/* Left 65%: Hours Summary Banner + 3-Level Collapsible Syllabus Tree */}
              <div className="lg:col-span-8 space-y-3">
                <div className="rounded-xl border border-[#1B2234] bg-[#0F131D] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[#B8C2D4]">
                    <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />
                    <span>
                      We&apos;ve planned{' '}
                      <strong className="text-[#FBBF24] font-semibold">
                        {(totalSubjectMinutes / 60).toFixed(1)} hours
                      </strong>{' '}
                      of focused learning for you.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveMode((v) => !v)}
                    className="text-[#60A5FA] hover:text-[#93C5FD] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>
                      {removeMode ? 'Done removing' : 'Already covered some topics? Remove them'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Syllabus Tree */}
                <div className="space-y-2.5 max-h-[54vh] overflow-y-auto pr-1">
                  {selectedSubjects.map((subId) => {
                    const meta = getSubjectMeta(subId);
                    if (!meta) return null;
                    const isDsa = subId === 'dsa';
                    const isExpandedSub = expandedSubjects[subId] ?? isDsa;

                    const subMinutes = isDsa
                      ? effectiveGoalPlan.skillRequirements.reduce((acc, r) => {
                          const probs = getCatalogProblemsByTopic(r.topic);
                          return acc + probs.reduce((s, p) => s + (p.estimatedMinutes || 25), 0) + 25;
                        }, 0)
                      : (meta.estimatedAdditionalHours || 4) * 60;

                    return (
                      <div
                        key={subId}
                        className="rounded-xl border border-[#192033] bg-[#0F131D] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSubjects((prev) => ({
                              ...prev,
                              [subId]: !isExpandedSub,
                            }))
                          }
                          className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-[#131928] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 font-medium text-[#F3F6FF]">
                            <motion.div
                              animate={{ rotate: isExpandedSub ? 90 : 0 }}
                              transition={{ duration: 0.18 }}
                            >
                              <ChevronRight className="w-4 h-4 text-[#7C8BA6]" />
                            </motion.div>
                            <span>{meta.shortLabel}</span>
                          </div>
                          <span className="text-xs font-mono text-[#7C8BA6]">
                            Est. {formatHoursMinutes(subMinutes)}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpandedSub && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-3 pt-2 pl-7 space-y-2 border-t border-[#171D2D]">
                                {isDsa ? (
                                  effectiveGoalPlan.skillRequirements.map((req) => {
                                    const problems = getCatalogProblemsByTopic(req.topic);
                                    const topicMins =
                                      problems.reduce((s, p) => s + (p.estimatedMinutes || 25), 0) +
                                      25;
                                    const isExpandedTopic = Boolean(expandedTopics[req.topic]);

                                    return (
                                      <div
                                        key={req.topic}
                                        className="border-l-2 border-[#1B2438] pl-3 space-y-1.5"
                                      >
                                        <div className="flex items-center justify-between gap-2 py-1">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedTopics((prev) => ({
                                                ...prev,
                                                [req.topic]: !prev[req.topic],
                                              }))
                                            }
                                            className="flex items-center gap-1.5 text-xs font-medium text-[#E2E8F5] hover:text-[#60A5FA] cursor-pointer text-left transition-colors"
                                          >
                                            <motion.div
                                              animate={{ rotate: isExpandedTopic ? 90 : 0 }}
                                              transition={{ duration: 0.15 }}
                                            >
                                              <ChevronRight className="w-3.5 h-3.5 text-[#7C8BA6]" />
                                            </motion.div>
                                            <span>{req.topic}</span>
                                          </button>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] font-mono text-[#7C8BA6]">
                                              {formatHoursMinutes(topicMins)}
                                            </span>
                                            {(removeMode ||
                                              effectiveGoalPlan.skillRequirements.length > 1) && (
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveTopic(req.topic)}
                                                className="p-1 rounded text-[#7C8BA6] hover:text-[#F87171] hover:bg-[#2C151A] cursor-pointer transition-colors"
                                                title={`Remove ${req.topic}`}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        <AnimatePresence initial={false}>
                                          {isExpandedTopic && (
                                            <motion.div
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: 'auto', opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              transition={{ duration: 0.18 }}
                                              className="overflow-hidden"
                                            >
                                              <div className="space-y-1 pl-4 pb-1">
                                                {problems.slice(0, 6).map((p, idx) => (
                                                  <div
                                                    key={p.verniqProblemId}
                                                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-[#181F30] bg-[#0B0E16] text-xs"
                                                  >
                                                    <span className="text-[#C3CEE0] truncate">
                                                      {idx + 1}. {p.title}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-[#7C8BA6] shrink-0">
                                                      {p.estimatedMinutes || 25}m
                                                    </span>
                                                  </div>
                                                ))}
                                                {problems.length === 0 && (
                                                  <div className="text-[11px] text-[#7C8BA6] px-2 py-1">
                                                    Concept drill &amp; core invariant review
                                                  </div>
                                                )}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    );
                                  })
                                ) : (
                                  meta.modules.map((m) => (
                                    <div
                                      key={m.title}
                                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-[#181F30] bg-[#0B0E16] text-xs"
                                    >
                                      <span className="text-[#C3CEE0] truncate">{m.title}</span>
                                      <span className="text-[11px] font-mono text-[#7C8BA6] shrink-0">
                                        {m.estimatedMinutes}m
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right 35%: Ask CHAKRIVA Customization Panel */}
              <div className="lg:col-span-4 rounded-xl border border-[#1B2234] bg-gradient-to-b from-[#111623] to-[#0D1018] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#F3F6FF] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Ask CHAKRIVA</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => runAiInterpret(draft)}
                    disabled={isInterpreting}
                    className="p-1.5 rounded-lg text-[#7C8BA6] hover:text-[#F3F6FF] hover:bg-[#171E30] transition-colors cursor-pointer"
                    title="Re-interpret goal"
                  >
                    {isInterpreting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3B82F6]" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="py-3 flex flex-col items-center text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-full bg-[#152443] border border-[#3B82F6]/35 flex items-center justify-center text-[#60A5FA] shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-medium text-[#F3F6FF]">
                    Customize your plan with CHAKRIVA
                  </div>
                  <p className="text-xs text-[#8592A8] leading-relaxed">
                    {effectiveGoalPlan.primaryRationale ||
                      effectiveGoalPlan.overallStrategy ||
                      `Prioritizing ${draft.targetRole} prerequisites cleanly across ${draft.timelineWeeks} weeks.`}
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#171D2D]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#6D7B94]">
                    Quick adjustments
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveMode((v) => !v)}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border text-xs text-left transition-colors cursor-pointer',
                      removeMode
                        ? 'bg-[#152443] border-[#3B82F6]/45 text-[#F3F6FF]'
                        : 'bg-[#0B0E16] border-[#1A2133] text-[#94A1B8] hover:text-[#F3F6FF] hover:border-[#29344E]'
                    )}
                  >
                    {removeMode
                      ? 'Finish removing covered topics'
                      : 'Trim already-covered DSA topics'}
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreAllTopics}
                    className="w-full px-3 py-2 rounded-lg border border-[#1A2133] bg-[#0B0E16] hover:border-[#29344E] text-xs text-[#94A1B8] hover:text-[#F3F6FF] text-left transition-colors cursor-pointer"
                  >
                    Restore full recommended syllabus
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 4 OF 5: SETUP WEEKLY AVAILABILITY                           */}
          {/* ================================================================ */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-[#1B2234] bg-[#0F131D] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#B8C2D4]">
                  <Zap className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <span>You can finish earlier by adding more hours on any day.</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleCopyMonToWeekdays}
                    className="text-[#60A5FA] hover:text-[#93C5FD] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Mon to Mon–Fri</span>
                  </button>
                  <div className="inline-flex items-center gap-1.5 text-[#F3F6FF] font-medium">
                    <Calendar className="w-3.5 h-3.5 text-[#7C8BA6]" />
                    <span>Est. days:</span>
                    <strong className="tabular-nums text-[#00B8A3]">{estDaysNeeded}</strong>
                  </div>
                </div>
              </div>

              {/* 7 Horizontal Day Stepper Rows */}
              <div className="space-y-2.5">
                {DAY_KEYS.map((day, idx) => {
                  const hrs = draft.weeklyAvailability[day] ?? 0;
                  const barPct = Math.min(100, Math.round((hrs / 8) * 100));
                  return (
                    <motion.div
                      key={day}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, delay: idx * 0.03 }}
                      className={cn(
                        'rounded-xl border px-4 py-3 flex items-center justify-between gap-4 transition-colors',
                        hrs > 0
                          ? 'bg-[#0F131D] border-[#1B2234]'
                          : 'bg-[#0B0E16] border-[#151B2B]'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-[140px]">
                        <Calendar
                          className={cn(
                            'w-4 h-4 shrink-0',
                            hrs > 0 ? 'text-[#3B82F6]' : 'text-[#526079]'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            hrs > 0 ? 'text-[#F3F6FF]' : 'text-[#7C8BA6]'
                          )}
                        >
                          {DAY_NAMES[day]}
                        </span>
                        {hrs === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#131826] border border-[#1D2539] text-[#7C8BA6]">
                            Day off
                          </span>
                        )}
                      </div>

                      {/* Subtle visual capacity bar on desktop */}
                      <div className="hidden sm:flex flex-1 items-center gap-3 max-w-xs">
                        <div className="w-full h-1.5 rounded-full bg-[#141A29] overflow-hidden">
                          <motion.div
                            className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
                            initial={false}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.25 }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-[#7C8BA6] w-9 text-right tabular-nums">
                          {hrs}h
                        </span>
                      </div>

                      <div className="inline-flex items-center rounded-lg border border-[#1E263B] bg-[#0B0D13] overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateAvailability(day, hrs - 1)}
                          disabled={hrs <= 0}
                          aria-label={`Decrease ${DAY_NAMES[day]} hours`}
                          className="px-2.5 py-1.5 text-[#94A1B8] hover:text-[#F3F6FF] hover:bg-[#151C2D] disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 py-1 text-xs font-mono font-medium text-[#F3F6FF] tabular-nums min-w-[2.25rem] text-center">
                          {hrs}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateAvailability(day, hrs + 1)}
                          disabled={hrs >= 12}
                          aria-label={`Increase ${DAY_NAMES[day]} hours`}
                          className="px-2.5 py-1.5 text-[#94A1B8] hover:text-[#F3F6FF] hover:bg-[#151C2D] disabled:opacity-30 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8592A8] pt-1">
                <span>
                  You have allocated a total of{' '}
                  <strong className="text-[#F3F6FF]">{totalWeeklyHours} hours</strong> for your
                  weekly schedule.
                </span>
                {!feasibility.isRealistic && (
                  <span className="text-[#FBBF24]">{feasibility.recommendation}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* ================================================================ */}
          {/* STEP 5 OF 5: FINALISE YOUR PLAN                                  */}
          {/* ================================================================ */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22 }}
              className="space-y-5"
            >
              {/* Top Form Row */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6 space-y-1.5">
                  <label className="block text-xs font-medium text-[#A8B4CA]">
                    Plan name<span className="text-[#EF4444] ml-0.5">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={60}
                      value={draft.planName || ''}
                      onChange={(e) => setDraft((p) => ({ ...p, planName: e.target.value }))}
                      placeholder={`${draft.targetRole} (${draft.timelineWeeks}w Plan)`}
                      className="w-full px-3.5 py-2.5 pr-14 rounded-xl border border-[#1D2538] bg-[#0F131D] text-sm text-[#F3F6FF] placeholder:text-[#5B6882] focus:outline-none focus:border-[#3B82F6]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono text-[#6D7B94] tabular-nums">
                      {(draft.planName || '').length}/60
                    </span>
                  </div>
                </div>

                <div className="md:col-span-6 space-y-1.5">
                  <label className="block text-xs font-medium text-[#A8B4CA]">
                    When do you want to start?<span className="text-[#EF4444] ml-0.5">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: 'today', label: 'Today' },
                        { id: 'tomorrow', label: 'Tomorrow' },
                        { id: 'custom', label: 'Custom' },
                      ] as { id: StartDateOption; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, startDateOption: opt.id }))}
                        className={cn(
                          'px-3.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer',
                          (draft.startDateOption || 'today') === opt.id
                            ? 'bg-[#152443] border-[#3B82F6]/50 text-[#F3F6FF] font-medium'
                            : 'bg-[#0F131D] border-[#1A2133] text-[#8592A8] hover:text-[#E2E8F5]'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {draft.startDateOption === 'custom' && (
                      <input
                        type="date"
                        value={draft.customStartDate || ''}
                        onChange={(e) => setDraft((p) => ({ ...p, customStartDate: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg border border-[#1D2538] bg-[#0F131D] text-xs text-[#F3F6FF] focus:outline-none focus:border-[#3B82F6]"
                      />
                    )}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-xl border border-[#EF4444]/40 bg-[#2C1418] p-3 text-xs text-[#FCA5A5]">
                  {errorMsg}
                </div>
              )}

              {/* Bottom Split: Left Sprint Preview + Right Plan Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 8 Cols: Your Sprint Preview */}
                <div className="lg:col-span-8 space-y-3">
                  <div className="text-xs font-medium text-[#A8B4CA]">Your sprint preview</div>

                  {finalizedPreviewPlan && (
                    <>
                      {/* Sprint 1..N Animated Pill Selector */}
                      <div className="flex flex-wrap gap-1.5">
                        {finalizedPreviewPlan.weeks.map((w, idx) => {
                          const active = previewSprintIdx === idx;
                          return (
                            <button
                              key={w.weekNumber}
                              type="button"
                              onClick={() => setPreviewSprintIdx(idx)}
                              className={cn(
                                'relative px-3 py-1.5 rounded-lg border text-xs transition-colors cursor-pointer',
                                active
                                  ? 'border-[#3B82F6]/45 text-[#F8FAFF] font-medium'
                                  : 'bg-[#0F131D] border-[#192033] text-[#7C8BA6] hover:text-[#E2E8F5]'
                              )}
                            >
                              {active && (
                                <motion.span
                                  layoutId="wizardSprintTab"
                                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                                  className="absolute inset-0 rounded-lg bg-[#152443] -z-0"
                                />
                              )}
                              <span className="relative z-10">Sprint {w.weekNumber}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Sprint Day 1..7 Accordions */}
                      <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                        {(finalizedPreviewPlan.weeks[previewSprintIdx]?.days || []).map(
                          (day, dIdx) => {
                            const key = `${previewSprintIdx}-${dIdx}`;
                            const isOpenDay = expandedPreviewDays[key] ?? dIdx === 0;
                            const dayMins = day.tasks.reduce(
                              (s, t) => s + (t.estimatedMinutes || 0),
                              0
                            );
                            return (
                              <div
                                key={day.dayOfWeek + dIdx}
                                className="rounded-xl border border-[#181F30] bg-[#0F131D] overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedPreviewDays((p) => ({ ...p, [key]: !isOpenDay }))
                                  }
                                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs hover:bg-[#131928] transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 text-[#F3F6FF] font-medium">
                                    <span>Day {dIdx + 1}</span>
                                    <span className="text-[#7C8BA6] font-normal">
                                      {day.isRestDay
                                        ? 'Day off'
                                        : finalizedPreviewPlan.weeks[previewSprintIdx]?.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[#7C8BA6] font-mono">
                                    <span>
                                      {day.isRestDay
                                        ? 'Rest'
                                        : `Est. ${formatHoursMinutes(dayMins)}`}
                                    </span>
                                    <motion.div
                                      animate={{ rotate: isOpenDay ? 180 : 0 }}
                                      transition={{ duration: 0.16 }}
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </motion.div>
                                  </div>
                                </button>

                                <AnimatePresence initial={false}>
                                  {isOpenDay && !day.isRestDay && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.18 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="px-4 pb-3 pt-2 border-t border-[#171D2D] space-y-1.5">
                                        {day.tasks.map((t) => (
                                          <div
                                            key={t.id}
                                            className="flex items-center justify-between gap-2 py-1 text-xs"
                                          >
                                            <span className="flex items-center gap-2 text-[#C3CEE0] truncate">
                                              <Circle className="w-3 h-3 text-[#5B6882] shrink-0" />
                                              <span className="truncate">{t.title}</span>
                                            </span>
                                            <span className="text-[11px] font-mono text-[#7C8BA6] shrink-0">
                                              {t.estimatedMinutes} min
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Right 4 Cols: Plan Summary */}
                <div className="lg:col-span-4 space-y-2.5">
                  <div className="rounded-xl border border-[#1B2234] bg-[#0F131D] p-3.5 flex items-center justify-between">
                    <span className="text-xs text-[#8592A8]">Est days</span>
                    <span className="text-lg font-semibold text-[#F8FAFF] tabular-nums">
                      {(finalizedPreviewPlan?.weeks.length || draft.timelineWeeks) * 7}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#1B2234] bg-[#0F131D] p-3.5 flex items-center justify-between">
                    <span className="text-xs text-[#8592A8]">Est completion</span>
                    <span className="text-xs font-medium font-mono text-[#00B8A3]">
                      {(() => {
                        const lastW =
                          finalizedPreviewPlan?.weeks[finalizedPreviewPlan.weeks.length - 1];
                        const lastD = lastW?.days[lastW.days.length - 1];
                        return lastD?.date || `${draft.timelineWeeks}w`;
                      })()}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#1B2234] bg-[#0F131D] p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#8592A8]">Role:</span>
                      <span className="text-[#F3F6FF] font-medium">{draft.targetRole}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8592A8]">Subjects:</span>
                      <span className="text-[#F3F6FF] font-medium">
                        {selectedSubjects.length} selected
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8592A8]">Total hours:</span>
                      <span className="text-[#60A5FA] font-medium font-mono">
                        {totalWeeklyHours * draft.timelineWeeks}h scheduled
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#8592A8]">Total sprints:</span>
                      <span className="text-[#F3F6FF] font-medium font-mono">
                        {finalizedPreviewPlan?.weeks.length || draft.timelineWeeks}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Minimal Obsidian Sticky Footer */}
      <div className="pt-5 mt-6 border-t border-[#171D2D] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs text-[#8592A8]">
          <div className="w-28 h-1.5 rounded-full bg-[#141A29] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#00B8A3]"
              initial={false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="font-mono text-[#A8B4CA]">Step {step} of 5</span>
          <span className="text-[#64728C]">· Draft saved</span>
        </div>

        <div className="flex items-center gap-2.5">
          {step > 1 && (
            <Button
              variant="outline"
              size="sm"
              className="!border-[#1E263B] !bg-[#0F131D] !text-[#C3CEE0] hover:!bg-[#161D2E] hover:!text-white"
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              onClick={() => setStep((s) => Math.max(1, s - 1))}
            >
              Previous
            </Button>
          )}

          {step < 5 ? (
            <Button
              variant="primary"
              size="sm"
              disabled={!canProceedStep}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={() => setStep((s) => Math.min(5, s + 1))}
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={isGenerating}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              onClick={handleGenerate}
            >
              Generate Plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
