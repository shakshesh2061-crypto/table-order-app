import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/endpoints/admin";
import { Button } from "../../components/Button";

export function StaffManager() {
  const queryClient = useQueryClient();
  const { data: staff } = useQuery({ queryKey: ["admin", "staff"], queryFn: adminApi.listStaff });
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "staff" as "staff" | "admin" });
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
  }

  async function addStaff() {
    setError(null);
    try {
      await adminApi.createStaff(form);
      setForm({ email: "", password: "", name: "", role: "staff" });
      invalidate();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await adminApi.updateStaff(id, { is_active: !isActive });
    invalidate();
  }

  async function remove(id: string) {
    await adminApi.deleteStaff(id);
    invalidate();
  }

  return (
    <div className="p-4 space-y-6">
      <section className="bg-white border border-neutral-200 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Add staff / admin account</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as "staff" | "admin" }))}
            className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <Button className="mt-3" onClick={addStaff}>
          Create account
        </Button>
      </section>

      <section className="space-y-2">
        {staff?.map((s) => (
          <div key={s.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="font-medium">
                {s.name} <span className="text-xs text-neutral-400 uppercase">{s.role}</span>
              </p>
              <p className="text-xs text-neutral-500">{s.email}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-xs" onClick={() => toggleActive(s.id, Boolean(s.is_active))}>
                {s.is_active ? "Deactivate" : "Activate"}
              </Button>
              <Button variant="danger" className="text-xs" onClick={() => remove(s.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
