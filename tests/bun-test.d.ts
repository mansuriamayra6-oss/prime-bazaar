declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function expect<T = any>(actual: T): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toContain(expected: any): void;
    toBeGreaterThan(n: number): void;
    toHaveLength(n: number): void;
    not: {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toContain(expected: any): void;
      toBeNull(): void;
      toBeUndefined(): void;
    };
  };
}
