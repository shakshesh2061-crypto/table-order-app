import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

interface NavItem {
  to: string;
  label: string;
}

const TITLE_EMOJI: Record<string, string> = {
  TableOrder: "🍔",
  Staff: "👨‍🍳",
  Admin: "⚙️",
};

export function Layout({ title, nav }: { title: string; nav: NavItem[] }) {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Site-wide decorative background — subtle, consistent across every page */}
      <div
        className="pointer-events-none fixed -z-10 -top-10 -right-16 w-56 h-56 rounded-full bg-brand-200/30 blur-3xl animate-float-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -z-10 top-1/3 -left-20 w-64 h-64 rounded-full bg-accent-100/40 blur-3xl animate-float-slower"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -z-10 bottom-0 right-0 w-48 h-48 rounded-full bg-purple-100/30 blur-3xl animate-float-slow"
        aria-hidden
      />

      <header className="sticky top-0 z-10 bg-gradient-to-r from-brand-500 to-brand-400 px-4 py-4 flex items-center justify-between shadow-md">
        <div>
          <h1 className="text-xl font-display font-semibold text-white flex items-center gap-2">
            <span>{TITLE_EMOJI[title] ?? "✨"}</span> {title}
          </h1>
          {user && <p className="text-xs text-brand-50/90">{user.name}</p>}
        </div>
        {user ? (
          <button
            onClick={logout}
            className="text-sm text-white/90 hover:text-white bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5"
          >
            Log out
          </button>
        ) : (
          <Link
            to="/login"
            className="text-sm text-brand-700 bg-white hover:bg-brand-50 font-semibold rounded-full px-4 py-1.5 shadow-sm"
          >
            Log in
          </Link>
        )}
      </header>

      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-neutral-200 flex justify-around py-2 px-2 shadow-[0_-2px_10px_-4px_rgba(0,0,0,0.1)]">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              `px-4 py-2 rounded-full text-sm font-semibold ${
                isActive ? "bg-brand-500 text-white shadow-md" : "text-neutral-400 hover:text-neutral-600"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
