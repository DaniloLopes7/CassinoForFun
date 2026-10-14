// Formata centavos como R$ ficticio com numeros tabulares (nao "pula" ao atualizar)
const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function fmtMoney(cents: number): string {
  return fmt.format((cents || 0) / 100);
}

export default function Money({ cents, className = '' }: { cents: number; className?: string }) {
  return (
    <span data-money className={`tabular ${className}`}>
      {fmtMoney(cents)}
    </span>
  );
}
