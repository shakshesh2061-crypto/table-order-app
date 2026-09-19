import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api/endpoints/admin";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Analytics() {
  const today = new Date().toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: daily } = useQuery({ queryKey: ["analytics", "daily"], queryFn: () => adminApi.dailyOrders(today) });
  const { data: revenue } = useQuery({
    queryKey: ["analytics", "revenue"],
    queryFn: () => adminApi.revenue(monthAgo, today),
  });
  const { data: popular } = useQuery({ queryKey: ["analytics", "popular"], queryFn: () => adminApi.popularItems(5) });

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500">Orders today</p>
          <p className="text-2xl font-semibold">{daily?.count ?? "–"}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <p className="text-xs text-neutral-500">Revenue (30d)</p>
          <p className="text-2xl font-semibold">{revenue ? formatPrice(revenue.revenue_cents) : "–"}</p>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <p className="font-semibold mb-3">Popular items</p>
        <div className="space-y-2">
          {popular?.map((p, idx) => (
            <div key={p.menu_item_id} className="flex justify-between text-sm">
              <span>
                {idx + 1}. {p.name}
              </span>
              <span className="text-neutral-500">{p.total_quantity} sold</span>
            </div>
          ))}
          {popular?.length === 0 && <p className="text-sm text-neutral-500">No order data yet.</p>}
        </div>
      </div>
    </div>
  );
}
