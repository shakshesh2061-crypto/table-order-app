import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { RequireRole } from "./auth/RequireRole";
import { CartProvider } from "./pages/customer/CartContext";
import { Layout } from "./components/Layout";

import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";

import { TableLanding } from "./pages/customer/TableLanding";
import { Menu } from "./pages/customer/Menu";
import { Cart } from "./pages/customer/Cart";
import { OrderTracking } from "./pages/customer/OrderTracking";
import { OrderHistory } from "./pages/customer/OrderHistory";

import { LiveQueue } from "./pages/staff/LiveQueue";
import { TableOverview } from "./pages/staff/TableOverview";

import { MenuManager } from "./pages/admin/MenuManager";
import { StaffManager } from "./pages/admin/StaffManager";
import { TableManager } from "./pages/admin/TableManager";
import { Analytics } from "./pages/admin/Analytics";

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-neutral-500">Loading…</div>;
  if (!user) return <Navigate to="/customer/menu" replace />;
  if (user.role === "admin") return <Navigate to="/admin/menu" replace />;
  if (user.role === "staff") return <Navigate to="/staff/queue" replace />;
  return <Navigate to="/customer/menu" replace />;
}

export function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/order" element={<TableLanding />} />

        <Route path="/customer" element={<Layout title="TableOrder" nav={[
          { to: "/customer/menu", label: "Menu" },
          { to: "/customer/cart", label: "Cart" },
          { to: "/customer/orders", label: "History" },
        ]} />}>
          <Route path="menu" element={<Menu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="orders" element={<OrderHistory />} />
          <Route path="orders/:id" element={<OrderTracking />} />
        </Route>

        <Route element={<RequireRole roles={["staff", "admin"]} />}>
          <Route path="/staff" element={<Layout title="Staff" nav={[
            { to: "/staff/queue", label: "Queue" },
            { to: "/staff/tables", label: "Tables" },
          ]} />}>
            <Route path="queue" element={<LiveQueue />} />
            <Route path="tables" element={<TableOverview />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={["admin"]} />}>
          <Route path="/admin" element={<Layout title="Admin" nav={[
            { to: "/admin/menu", label: "Menu" },
            { to: "/admin/staff", label: "Staff" },
            { to: "/admin/tables", label: "Tables" },
            { to: "/admin/analytics", label: "Analytics" },
          ]} />}>
            <Route path="menu" element={<MenuManager />} />
            <Route path="staff" element={<StaffManager />} />
            <Route path="tables" element={<TableManager />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  );
}
