import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      {children}
    </main>
  );
}
