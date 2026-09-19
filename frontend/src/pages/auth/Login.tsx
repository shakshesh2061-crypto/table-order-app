import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";

export function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user) navigate("/");

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-accent-50">
      <div
        className="pointer-events-none absolute -top-16 -left-16 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl animate-float-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-accent-200/40 blur-3xl animate-float-slower"
        aria-hidden
      />
      <span className="pointer-events-none absolute top-12 left-10 text-3xl animate-float-slow" aria-hidden>🍕</span>
      <span className="pointer-events-none absolute bottom-16 right-10 text-3xl animate-float-slower" aria-hidden>🍰</span>
      <span className="pointer-events-none absolute top-1/3 right-16 text-2xl animate-float-slow" aria-hidden>🥤</span>

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm bg-white border-2 border-neutral-100 rounded-3xl p-6 space-y-4 shadow-card animate-fade-in-up"
      >
        <div className="text-center">
          <div className="text-4xl mb-1 animate-float-slow inline-block">🍔</div>
          <h1 className="text-2xl font-display font-semibold text-brand-600">TableOrder</h1>
          <p className="text-sm text-neutral-500">Sign in to your account</p>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-2 border-neutral-200 rounded-xl px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in 🚀"}
        </Button>
        <p className="text-xs text-neutral-500 text-center">
          No account? <Link to="/register" className="text-brand-600 font-semibold">Register</Link> or{" "}
          <Link to="/customer/menu" className="text-brand-600 font-semibold">browse as guest</Link>
        </p>
        <div className="text-xs text-neutral-400 text-center pt-2 border-t border-neutral-100">
          Demo accounts: admin@demo.com / staff@demo.com / customer@demo.com — password123
        </div>
      </form>
    </div>
  );
}
