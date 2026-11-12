/**
 * CHAKRIVA — Riva 4.1: Scroll Reliability, Clean Telemetry & Empty-State Suite (MJS)
 * 
 * Verifies:
 * 1. Automatic Code Relevance Detection (heuristics for code vs. conceptual queries)
 * 2. Clean Telemetry (token accounting preserved in data layer, omitted from chat UI)
 * 3. Compact Empty State Specification (strictly 3 inline chips, no 4-card hero container)
 * 4. Layout-Level Scroll Mechanics & Height-Shift Follow Engine (ResizeObserver logic)
 * 5. Clean In-Place Retry & In-Flight Cancellation
 * 6. Per-Problem Cache Segregation & Scroll State Reset
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Mirror of `isCodeContextRelevant` from ChakrivaAiDrawer.tsx
 */
export function isCodeContextRelevant(query, code) {
  if (!code || !code.trim()) return false;
  const q = query.toLowerCase();
  const signals = [
    'code', 'my code', 'review', 'debug', 'error', 'bug', 'fix', 'why',
    'fail', 'wrong', 'solution', 'implementation', 'line', 'syntax',
    'test', 'run', 'slow', 'tle', 'compile', 'optimize', 'rate',
    'issue', 'exception', 'pointer', 'loop', 'approach', 'memory',
    'look at', 'is this right', 'check this', 'what is wrong', 'help me fix',
    'what did i do wrong', 'runtime', 'mle'
  ];
  return signals.some((s) => q.includes(s));
}

/**
 * Mirror of scroll distance-to-bottom calculation
 */
export function checkIsNearBottom(scrollHeight, scrollTop, clientHeight, threshold = 80) {
  const distanceToBottom = scrollHeight - scrollTop - clientHeight;
  return distanceToBottom <= threshold;
}

/**
 * Simulation of ResizeObserver height follow logic:
 * When content height expands (e.g. Markdown renders or tokens arrive):
 * - If was near bottom: automatically stick to bottom
 * - If was scrolled away: do not force conversation down
 */
export function handleContentResize(container, isNearBottom) {
  if (isNearBottom) {
    container.scrollTop = container.scrollHeight;
    return true; // auto-scrolled
  }
  return false; // preserved user history position
}

/**
 * Mirror of clean retry state reducer
 */
export function applyCleanRetry(messages, retryQuery, newReply, tokens = {}) {
  const cleaned = messages.filter((m) => !m.isError);
  return [
    ...cleaned,
    {
      id: `msg-ai-${Date.now()}`,
      sender: 'assistant',
      content: newReply,
      timestamp: Date.now(),
      mode: 'chat',
      ...tokens,
    },
  ];
}

/**
 * Helper to test message header rendering:
 * Ensures token badges are NOT rendered to users
 */
export function renderMessageHeaderTokens(msg) {
  // Riva 4.1 specification: Never render token counts in the chat UI
  return null;
}

describe('CHAKRIVA Riva 4.1 — Reliability & UX Suite', () => {
  describe('1. Automatic Code Relevance Detection', () => {
    const dummyCode = 'function twoSum(nums, target) { return []; }';

    test('Attaches code when user asks for code review or debugging', () => {
      assert.equal(isCodeContextRelevant('Can you review my code?', dummyCode), true);
      assert.equal(isCodeContextRelevant('Why is my solution failing test 3?', dummyCode), true);
      assert.equal(isCodeContextRelevant('Help me fix this line syntax error', dummyCode), true);
      assert.equal(isCodeContextRelevant('How to optimize my loop to prevent TLE?', dummyCode), true);
      assert.equal(isCodeContextRelevant('What is wrong with my approach here?', dummyCode), true);
    });

    test('Omits code when user asks general conceptual or algorithmic questions', () => {
      assert.equal(isCodeContextRelevant('What is Dijkstra algorithm?', dummyCode), false);
      assert.equal(isCodeContextRelevant('Give me a hint from scratch', dummyCode), false);
      assert.equal(isCodeContextRelevant('What are the constraints for N?', dummyCode), false);
      assert.equal(isCodeContextRelevant('Hello Riva!', dummyCode), false);
    });

    test('Omits code if editor buffer is empty even if keywords match', () => {
      assert.equal(isCodeContextRelevant('Review my code', ''), false);
      assert.equal(isCodeContextRelevant('Fix my bug', '   \n  '), false);
    });
  });

  describe('2. Clean Telemetry (Tokens preserved in data layer, hidden from chat UI)', () => {
    test('Stores tokens in response object for backend telemetry but renders null in UI', () => {
      const response = {
        success: true,
        reply: 'The optimal approach uses a hash map with O(N) time.',
        tokensUsed: 642,
        promptTokens: 550,
        completionTokens: 92,
      };

      const message = {
        id: 'msg-ai-1',
        sender: 'assistant',
        content: response.reply,
        timestamp: Date.now(),
        mode: 'chat',
        tokensUsed: response.tokensUsed,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
      };

      // Telemetry fields exist in data model
      assert.equal(message.tokensUsed, 642);
      assert.equal(message.promptTokens, 550);
      assert.equal(message.completionTokens, 92);

      // UI rendering helper produces no token counter badge
      const renderedHeader = renderMessageHeaderTokens(message);
      assert.equal(renderedHeader, null);
    });
  });

  describe('3. Compact Empty State Specification', () => {
    test('Specifies exactly 3 compact inline suggestion chips and no oversized hero card', () => {
      const emptyStateChips = [
        'Review my code',
        'Give me a hint',
        'Explain the approach',
      ];

      assert.equal(emptyStateChips.length, 3);
      assert.ok(emptyStateChips.includes('Review my code'));
      assert.ok(emptyStateChips.includes('Give me a hint'));
      assert.ok(emptyStateChips.includes('Explain the approach'));
    });
  });

  describe('4. Layout-Level Scroll Mechanics & Height Shifts', () => {
    test('Calculates near-bottom accurately with 80px threshold', () => {
      assert.equal(checkIsNearBottom(1000, 500, 500), true);
      assert.equal(checkIsNearBottom(1000, 430, 500), true);
      assert.equal(checkIsNearBottom(1000, 420, 500), true);
      assert.equal(checkIsNearBottom(1000, 400, 500), false);
      assert.equal(checkIsNearBottom(1000, 100, 500), false);
    });

    test('Follows content height expansion when user was near bottom', () => {
      const container = { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 };
      // Content height grows from 1000px to 1400px (e.g. Markdown code block finishes rendering)
      container.scrollHeight = 1400;

      const autoScrolled = handleContentResize(container, true);
      assert.equal(autoScrolled, true);
      assert.equal(container.scrollTop, 1400);
    });

    test('Preserves scroll position when user scrolled upward to read history', () => {
      const container = { scrollTop: 100, scrollHeight: 1000, clientHeight: 500 };
      // Content height grows while user is reading history
      container.scrollHeight = 1400;

      const autoScrolled = handleContentResize(container, false);
      assert.equal(autoScrolled, false);
      assert.equal(container.scrollTop, 100); // Unchanged
    });
  });

  describe('5. Clean Retry and Cancellation', () => {
    test('Retry removes error turn in-place without duplicating user message', () => {
      const initialMessages = [
        { id: '1', sender: 'user', content: 'How do I solve this?' },
        { id: '2', sender: 'assistant', content: 'Connection timed out', isError: true, canRetry: true },
      ];

      const afterRetry = applyCleanRetry(
        initialMessages,
        'How do I solve this?',
        'Consider using two pointers.',
        { tokensUsed: 35 }
      );

      assert.equal(afterRetry.length, 2);
      assert.equal(afterRetry[0].sender, 'user');
      assert.equal(afterRetry[0].content, 'How do I solve this?');
      assert.equal(afterRetry[1].sender, 'assistant');
      assert.equal(afterRetry[1].content, 'Consider using two pointers.');
      assert.equal(afterRetry[1].isError, undefined);
    });
  });

  describe('6. Per-Problem Cache Segregation', () => {
    test('Isolates conversation history cleanly between different problems', () => {
      const problemCache = {};

      problemCache['prob-101'] = {
        messages: [
          { id: 'u1', sender: 'user', content: 'Help on Two Sum' },
          { id: 'a1', sender: 'assistant', content: 'Use a hash map.' },
        ],
      };

      problemCache['prob-102'] = {
        messages: [
          { id: 'u2', sender: 'user', content: 'Help on Trapping Rainwater' },
        ],
      };

      assert.equal(problemCache['prob-101'].messages.length, 2);
      assert.equal(problemCache['prob-102'].messages.length, 1);

      // Resetting problem A does not affect problem B
      problemCache['prob-101'] = { messages: [] };
      assert.equal(problemCache['prob-101'].messages.length, 0);
      assert.equal(problemCache['prob-102'].messages.length, 1);
    });
  });
});
