import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/layout/Container';
import { PageHeader } from '@/components/ui/layout/PageHeader';
import { Layers, Clock, ArrowRight, Terminal, Compass, CheckCircle2 } from 'lucide-react';
import { LEARN_TRACKS, formatMinutesLabel } from '@/features/learn/data/learnCatalog';
import { learnProgressService } from '@/features/learn/services/learnProgressService';

export const CoursesView: React.FC = () => {
  const masterclassTracks = useMemo(
    () => LEARN_TRACKS.filter((t) => t.category === 'systems_labs'),
    []
  );
  const progress = useMemo(() => learnProgressService.getState(), []);

  return (
    <div className="py-8 space-y-8 text-left text-[#F3F6FF]">
      <Container size="xl">
        <PageHeader
          badge="Engineering Masterclasses"
          title="Advanced Systems & Engineering Tracks"
          subtitle="Comprehensive, systems-level engineering tracks taught through architectural invariants, failure modes, and runtime walkthroughs."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {masterclassTracks.map((course) => {
            const stats = learnProgressService.getTrackCompletion(course, progress);
            return (
              <div
                key={course.id}
                className="rounded-2xl border border-[#192033] bg-[#0F131D] hover:border-[#29344E] p-5 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#291E0B] text-[#FCD34D]">
                      {course.levelBadge}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-[#7C8BA6] font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatMinutesLabel(course.totalMinutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {course.lessons.length} lessons
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-base font-semibold text-[#F8FAFF]">{course.title}</h2>
                    <p className="text-xs text-[#8592A8] leading-relaxed mt-1">{course.subtitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-xl bg-[#0B0E16] border border-[#171D2D]">
                    <div>
                      <span className="text-[#6D7B94] block text-[10px]">PREREQUISITE</span>
                      <span className="text-[#E2E8F5] font-medium">
                        {course.prerequisites[0] || 'Core CS'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6D7B94] block text-[10px]">ARCHITECTURE FOCUS</span>
                      <span className="text-[#60A5FA] font-medium flex items-center gap-1 truncate">
                        <Terminal className="w-3 h-3 shrink-0" />
                        <span className="truncate">{course.environmentLabel || 'Interactive'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#171D2D] flex items-center justify-between gap-3">
                  <Link
                    to="/app/roadmap"
                    className="text-[11px] text-[#7C8BA6] hover:text-[#F3F6FF] font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#00B8A3]" />
                    <span>Adaptive Roadmap</span>
                  </Link>

                  <Link
                    to={`/app/learn/${course.slug}/${course.lessons[0].slug}`}
                    className="px-3.5 py-2 rounded-xl border border-[#243B6B] bg-[#152443] hover:bg-[#1C3159] text-xs font-medium text-[#F3F6FF] inline-flex items-center gap-1.5 transition-colors"
                  >
                    {stats.completed > 0 ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00B8A3]" />
                        <span>
                          Continue ({stats.completed}/{stats.total})
                        </span>
                      </>
                    ) : (
                      <>
                        <span>Open Syllabus</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </div>
  );
};
