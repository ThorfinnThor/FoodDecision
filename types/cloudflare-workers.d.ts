declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
  };
}

type Fetcher = {
  fetch(request: Request): Promise<Response>;
};

interface D1Database {
  prepare(query: string): {
    bind(...values: unknown[]): unknown;
    first<T = unknown>(): Promise<T | null>;
    run(): Promise<unknown>;
    all<T = unknown>(): Promise<{ results: T[] }>;
  };
  batch<T = unknown>(statements: unknown[]): Promise<T[]>;
  exec(query: string): Promise<unknown>;
}
