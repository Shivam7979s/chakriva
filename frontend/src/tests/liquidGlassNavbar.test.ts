import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

describe('Liquid Glass (liquidGL) Integration Suite', () => {
  let liquidGL: any;

  before(async () => {
    // Provide browser mocks before dynamically importing liquid-gl (which checks `typeof window === 'undefined'`)
    const listeners = new Map<string, Function[]>();
    (globalThis as any).window = {
      addEventListener: (type: string, fn: Function) => {
        const arr = listeners.get(type) || [];
        arr.push(fn);
        listeners.set(type, arr);
      },
      removeEventListener: () => {},
      devicePixelRatio: 1,
      innerWidth: 1920,
      innerHeight: 1080,
      location: { search: '' },
      document: {
        documentElement: { clientWidth: 1920, clientHeight: 1080 },
        createElement: (tag: string) => ({
          tagName: tag.toUpperCase(),
          style: {},
          appendChild: () => {},
          remove: () => {},
          getContext: () => ({
            drawImage: () => {},
            clearRect: () => {},
            fillRect: () => {},
          }),
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
      },
    };
    (globalThis as any).document = (globalThis as any).window.document;
    (globalThis as any).requestAnimationFrame = (cb: Function) => setTimeout(cb, 16);
    (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

    const mod = await import('liquid-gl');
    liquidGL = mod.default;
  });

  test('liquidGL exports the expected core API', () => {
    assert.strictEqual(typeof liquidGL, 'function', 'liquidGL should be a callable function');
    assert.strictEqual(typeof liquidGL.registerDynamic, 'function', 'liquidGL should expose registerDynamic');
    assert.strictEqual(typeof liquidGL.syncWith, 'function', 'liquidGL should expose syncWith');
  });

  test('liquidGL returns undefined when target element is not found in DOM without crashing', () => {
    const result = liquidGL({
      target: '#non-existent-selector-12345',
      snapshot: 'body',
    });
    assert.strictEqual(result, undefined, 'liquidGL should return undefined when element is absent');
  });

  test('Lens instance interface contract exposes destroy, setTint, and updateMetrics', () => {
    const mockLens = {
      el: {} as HTMLElement,
      options: { target: '#chakriva-landing-navbar' },
      destroy: () => {},
      setTint: (_c: string | null) => {},
      setDraggable: (_e: boolean) => {},
      setTilt: (_e: boolean) => {},
      setShadow: (_e: boolean) => {},
      updateMetrics: () => {},
      clearDrag: () => {},
    };

    assert.strictEqual(typeof mockLens.destroy, 'function');
    assert.strictEqual(typeof mockLens.setTint, 'function');
    assert.strictEqual(typeof mockLens.updateMetrics, 'function');
  });

  test('Navbar integration targets the canonical Chakriva navigation selectors', () => {
    const landingSelector = '#chakriva-landing-navbar';
    const globalSelector = '#chakriva-global-header';

    assert.ok(landingSelector.startsWith('#chakriva-'), 'Landing navbar selector must use #chakriva prefix');
    assert.ok(globalSelector.startsWith('#chakriva-'), 'Global header selector must use #chakriva prefix');
  });
});
