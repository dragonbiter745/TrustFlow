import { CheckCircle, Clock, AlertTriangle, XCircle, Send } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; className: string; Icon: any }> = {
  FUNDED: { label: "Funded", className: "badge-funded", Icon: Clock },
  WORK_SUBMITTED: { label: "Work Submitted", className: "badge-submitted", Icon: Send },
  RELEASED: { label: "Released", className: "badge-released", Icon: CheckCircle },
  DISPUTED: { label: "Disputed", className: "badge-disputed", Icon: AlertTriangle },
  REFUNDED: { label: "Refunded", className: "badge-refunded", Icon: XCircle },
};

export default function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.FUNDED;
  const { label, className, Icon } = config;
  return (
    <span className={`badge ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
