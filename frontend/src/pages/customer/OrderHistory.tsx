import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ordersApi } from "../../api/endpoints/orders";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { useAuth } from "../../auth/AuthContext";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders } = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: ordersApi.mine,
    enabled: Boolean(user),
  });

  if (!user) {
    return <div className="p-8 text-center text-neutral-500">Log in to view your order history.</div>;
  }

  if (!orders || orders.length === 0) {
    return <div className="p-8 text-center text-neutral-500">No past orders yet.</div>;
  }

  async function reorder(id: string) {
    const order = await ordersApi.reorder(id);
    queryClient.invalidateQueries({ queryKey: ["orders", "mine"] });
    navigate(`/customer/orders/${order.id}`);
  }

  return (
    <div className="p-4 space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-white border border-neutral-200 rounded-xl p-3">
          <div className="flex justify-between items-center">
            <Link to={`/customer/orders/${order.id}`} className="font-medium">
              Order #{order.id.slice(0, 8)}
            </Link>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-xs text-neutral-500 mt-1">{new Date(order.created_at).toLocaleString()}</p>
          <p className="text-sm mt-1">
            {order.items.map((i) => `${i.quantity}× ${i.name_snapshot}`).join(", ")}
          </p>
          <div className="flex justify-between items-center mt-2">
            <p className="font-bold text-brand-600">{formatPrice(order.total_cents)}</p>
            <Button variant="ghost" onClick={() => reorder(order.id)}>
              Reorder
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
