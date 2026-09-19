import type { OrderStatus } from "@table-order/shared";

const STYLES: Record<OrderStatus, string> = {
  received: "bg-blue-100 text-blue-700",
  preparing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  served: "bg-neutral-200 text-neutral-700",
  completed: "bg-neutral-200 text-neutral-500",
  cancelled: "bg-red-100 text-red-700",
};

const EMOJI: Record<OrderStatus, string> = {
  received: "📝",
  preparing: "🔥",
  ready: "🔔",
  served: "🍽️",
  completed: "✅",
  cancelled: "❌",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STYLES[status]}`}
    >
      <span>{EMOJI[status]}</span> {status}
    </span>
  );
}
