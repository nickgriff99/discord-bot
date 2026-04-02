import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-surface"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-32 top-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-24 bottom-0 -z-10 h-[32rem] w-[32rem] rounded-full bg-orange-600/15 blur-[110px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[size:64px_64px] bg-grid-pattern opacity-40"
        aria-hidden
      />

      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">{children}</div>
      <SiteFooter />
    </div>
  );
}
