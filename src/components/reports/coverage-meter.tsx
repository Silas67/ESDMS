import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// Fixed status palette — never themed, always paired with an icon + label
// so severity never rides on color alone.
const STATUS = {
  good: { color: "#0ca30c", Icon: CheckCircle2, label: "On track" },
  warning: { color: "#fab219", Icon: AlertTriangle, label: "Needs attention" },
  critical: { color: "#d03b3b", Icon: XCircle, label: "Critical gap" },
} as const;

function severityFor(percent: number): keyof typeof STATUS {
  if (percent >= 80) return "good";
  if (percent >= 50) return "warning";
  return "critical";
}

export function CoverageMeter({ percent }: { percent: number }) {
  const severity = severityFor(percent);
  const { color, Icon, label } = STATUS[severity];

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2 w-24 rounded-full"
        style={{ backgroundColor: `${color}26` }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percent}% covered`}
      >
        <div
          className="h-2 rounded-full transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
        />
      </div>
      <Icon className="size-3.5 shrink-0" style={{ color }} />
      <span className="text-sm font-medium tabular-nums">{percent}%</span>
    </div>
  );
}
