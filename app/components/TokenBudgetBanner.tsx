import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { type FC } from 'react';

interface TokenBudgetBannerProps {
  tokensUsed: number;
  budget: number | null;
}

export const TokenBudgetBanner: FC<TokenBudgetBannerProps> = ({ tokensUsed, budget }) => {
  if (!budget) return null;

  const pct = Math.round((tokensUsed / budget) * 100);
  const isWarning = pct >= 80 && pct <= 100;
  const isExceeded = pct > 100;

  const barColor = isExceeded
    ? 'bg-red-500'
    : isWarning
      ? 'bg-orange-500'
      : 'bg-emerald-500';

  const textColor = isExceeded
    ? 'text-red-700'
    : isWarning
      ? 'text-orange-700'
      : 'text-emerald-700';

  const borderColor = isExceeded
    ? 'border-red-500/25'
    : isWarning
      ? 'border-orange-500/25'
      : 'border-emerald-500/20';

  const bgGradient = isExceeded
    ? 'from-red-50/90 via-white to-red-50/80'
    : isWarning
      ? 'from-orange-50/90 via-white to-orange-50/80'
      : 'from-emerald-50/90 via-white to-emerald-50/80';

  return (
    <div
      className={`flex flex-col gap-1.5 rounded-lg border ${borderColor} bg-gradient-to-r ${bgGradient} px-3 py-2 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-center gap-1.5">
        {isExceeded ? (
          <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
        ) : isWarning ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-orange-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
        )}
        <span className={`text-[12px] font-medium tabular-nums ${textColor}`}>
          {tokensUsed.toLocaleString()} / {budget.toLocaleString()} tokens
          {isExceeded && ' — limit exceeded!'}
          {isWarning && !isExceeded && ' — approaching limit'}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/5">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
};
