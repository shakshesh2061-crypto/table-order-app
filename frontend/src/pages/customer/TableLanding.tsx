import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ordersApi } from "../../api/endpoints/orders";
import { useCart } from "./CartContext";

export function TableLanding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setTableSession } = useCart();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qrToken = params.get("table");
    if (!qrToken) {
      navigate("/customer/menu", { replace: true });
      return;
    }
    ordersApi
      .createTableSession(qrToken)
      .then(({ table, session }) => {
        setTableSession(session.id, session.session_token, table.label);
        navigate("/customer/menu", { replace: true });
      })
      .catch(() => setError("This QR code isn't recognized. You can still browse and order as a guest."));
  }, []);

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-neutral-600">{error}</p>
        <button className="text-brand-600 underline" onClick={() => navigate("/customer/menu")}>
          Continue to menu
        </button>
      </div>
    );
  }

  return <div className="p-8 text-center text-neutral-500">Linking your table…</div>;
}
