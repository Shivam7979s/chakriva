import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LEARN_TRACKS,
  PREP_HUB_TABS,
  resolveCategoryFromQuery,
  getQuerySlugForCategory,
  groupTrackModules,
  getLearnTrackBySlug,
  getLearnTrackBySubjectId,
  getLessonInTrack,
} from '../features/learn/data/learnCatalog.ts';
import { resolveLearnHrefForTask } from '../features/learn/services/learnProgressService.ts';
import { CANONICAL_CATALOG_PROBLEMS } from '../features/roadmap/utils/adaptiveEngine.ts';

test('CHAKRIVA Prep Hub Catalog — Integrates DSA, Core CS, System Design, Data & SQL & Systems Labs', () => {
  assert.ok(LEARN_TRACKS.length >= 12, 'Expected at least 12 structured Prep Hub tracks');
  assert.equal(PREP_HUB_TABS.length, 5);

  const categories = new Set(LEARN_TRACKS.map((t) => t.category));
  assert.ok(categories.has('dsa'));
  assert.ok(categories.has('core_cs'));
  assert.ok(categories.has('system_design'));
  assert.ok(categories.has('data_sql'));
  assert.ok(categories.has('systems_labs'));

  assert.equal(resolveCategoryFromQuery('core-cs'), 'core_cs');
  assert.equal(resolveCategoryFromQuery('system-design'), 'system_design');
  assert.equal(resolveCategoryFromQuery('data-sql'), 'data_sql');
  assert.equal(resolveCategoryFromQuery(null), 'dsa');
  assert.equal(getQuerySlugForCategory('core_cs'), 'core-cs');

  const validProblemSlugs = new Set(CANONICAL_CATALOG_PROBLEMS.map((p) => p.slug));
  for (const track of LEARN_TRACKS) {
    assert.ok(track.lessons.length >= 2, `Track ${track.slug} must have >= 2 lessons`);
    assert.ok(track.sectionLabel.length > 0);
    const modules = groupTrackModules(track);
    assert.ok(modules.length >= 1, `Track ${track.slug} must group into >= 1 module`);

    for (const lesson of track.lessons) {
      assert.ok(lesson.keyInvariant.length > 10);
      assert.ok(lesson.mentalModel.length > 10);
      for (const slug of lesson.linkedProblemSlugs || []) {
        assert.ok(
          validProblemSlugs.has(slug),
          `Linked problem slug ${slug} in ${lesson.id} must exist in CANONICAL_CATALOG_PROBLEMS`
        );
      }
    }
  }
});

test('CHAKRIVA Prep Hub — Resolves every Roadmap SubjectId & study_module task cleanly', () => {
  const subjects = ['dsa', 'system_design', 'dbms', 'os', 'cn', 'oop', 'sql', 'cs_fundamentals', 'aptitude'];
  for (const sub of subjects) {
    const track = getLearnTrackBySubjectId(sub);
    assert.ok(track, `Subject ${sub} must resolve to a LearnTrack`);
    const lesson = getLessonInTrack(track);
    assert.ok(lesson && lesson.slug);
  }

  const hrefSystemDesign = resolveLearnHrefForTask({
    id: 'task-sd-1',
    title: 'HLD Concept: Consistent Hashing, Sharding & Replication',
    topic: 'System Design (HLD)',
    subject: 'system_design',
    estimatedMinutes: 35,
    priority: 'medium',
    status: 'pending',
    taskType: 'study_module',
  });
  assert.ok(hrefSystemDesign.startsWith('/app/learn/system-design/'));
  assert.ok(hrefSystemDesign.includes('taskId=task-sd-1'));
  assert.ok(hrefSystemDesign.includes('fromRoadmap=adaptive'));

  const dbTrack = getLearnTrackBySlug('database-internals-rust');
  assert.ok(dbTrack);
  assert.equal(dbTrack.category, 'systems_labs');
});
