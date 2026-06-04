import { ReactNode } from 'react';

interface StaticInfoPageProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export default function StaticInfoPage({ eyebrow, title, description, children }: StaticInfoPageProps) {
  return (
    <main className="min-h-screen bg-gray-50 pb-20 pt-24">
      <section className="bg-[#003078] px-6 py-16 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[#edbb00]">{eyebrow}</p>
          <h1 className="m-0 text-4xl font-black uppercase tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-sm font-medium leading-7 text-blue-100">{description}</p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-6 py-12">{children}</section>
    </main>
  );
}
