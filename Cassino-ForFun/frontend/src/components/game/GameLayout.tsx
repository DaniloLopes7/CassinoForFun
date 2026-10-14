import React from 'react';
import BetAmount from './BetAmount';

/** Layout padrao dos jogos: palco (esq) + painel de aposta (dir) */
export default function GameLayout({
  title,
  stage,
  controls,
  info,
}: {
  title: string;
  stage: React.ReactNode;
  controls: React.ReactNode;
  info?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:py-6">
      <h1 className="mb-4 font-display text-2xl text-gold md:text-3xl">{title}</h1>
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="dbet-card relative flex min-h-[320px] items-center justify-center overflow-hidden p-4">{stage}</div>
        <div className="flex flex-col gap-3">
          <div className="dbet-card p-4">{controls}</div>
          {info && <div className="dbet-card p-4 text-sm text-ink-muted">{info}</div>}
        </div>
      </div>
    </div>
  );
}

export { BetAmount };
