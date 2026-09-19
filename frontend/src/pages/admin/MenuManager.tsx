import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { menuApi } from "../../api/endpoints/menu";
import { adminApi } from "../../api/endpoints/admin";
import { Button } from "../../components/Button";
import type { SetItemRef } from "../../types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuManager() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["menu"], queryFn: menuApi.list });
  const [newCategory, setNewCategory] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    name: "",
    description: "",
    price: "",
    discount_percent: "",
    is_recommended: false,
    is_set: false,
  });
  const [setSelections, setSetSelections] = useState<Record<string, number>>({}); // menu_item_id -> qty (0 = not included)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    await adminApi.createCategory(newCategory.trim());
    setNewCategory("");
    invalidate();
  }

  async function addItem() {
    if (!form.category_id || !form.name || !form.price) return;
    const set_items: SetItemRef[] = form.is_set
      ? Object.entries(setSelections)
          .filter(([, qty]) => qty > 0)
          .map(([menu_item_id, quantity]) => ({ menu_item_id, quantity }))
      : [];

    await adminApi.createMenuItem({
      category_id: form.category_id,
      name: form.name,
      description: form.description,
      price_cents: Math.round(parseFloat(form.price) * 100),
      discount_percent: form.discount_percent ? parseInt(form.discount_percent, 10) : 0,
      is_recommended: form.is_recommended,
      is_set: form.is_set,
      set_items,
    });
    setForm({ category_id: form.category_id, name: "", description: "", price: "", discount_percent: "", is_recommended: false, is_set: false });
    setSetSelections({});
    invalidate();
  }

  async function deleteItem(id: string) {
    await adminApi.deleteMenuItem(id);
    invalidate();
  }

  async function uploadPhoto(id: string, file: File) {
    await adminApi.uploadPhoto(id, file);
    invalidate();
  }

  async function toggleRecommended(id: string, current: boolean | number) {
    await adminApi.updateMenuItem(id, { is_recommended: !current });
    invalidate();
  }

  async function setDiscount(id: string, percent: string) {
    const value = Math.max(0, Math.min(90, parseInt(percent, 10) || 0));
    await adminApi.updateMenuItem(id, { discount_percent: value });
    invalidate();
  }

  if (!data) return null;

  return (
    <div className="p-4 space-y-6">
      <section className="bg-white border-2 border-neutral-100 rounded-2xl p-4 shadow-card">
        <h2 className="font-display font-semibold mb-2">Categories</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.categories.map((c) => (
            <span key={c.id} className="text-xs bg-neutral-100 rounded-full px-3 py-1">
              {c.name}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            placeholder="New category name"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
          />
          <Button onClick={addCategory}>Add</Button>
        </div>
      </section>

      <section className="bg-white border-2 border-neutral-100 rounded-2xl p-4 shadow-card">
        <h2 className="font-display font-semibold mb-2">Add menu item</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className="border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            placeholder="Price (e.g. 12.50)"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm"
          />
          <input
            placeholder="Discount % (optional, e.g. 15)"
            value={form.discount_percent}
            onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))}
            className="border-2 border-neutral-200 rounded-xl px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_recommended}
              onChange={(e) => setForm((f) => ({ ...f, is_recommended: e.target.checked }))}
              className="w-4 h-4 accent-accent-500"
            />
            ⭐ Recommend this item
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_set}
              onChange={(e) => setForm((f) => ({ ...f, is_set: e.target.checked }))}
              className="w-4 h-4 accent-purple-500"
            />
            🎁 This is a combo/set meal
          </label>
        </div>

        {form.is_set && (
          <div className="mt-3 bg-purple-50 border-2 border-purple-100 rounded-xl p-3">
            <p className="text-xs font-semibold text-purple-600 mb-2">Select items included in this combo:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {data.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 flex-1">
                    <input
                      type="checkbox"
                      checked={(setSelections[item.id] ?? 0) > 0}
                      onChange={(e) =>
                        setSetSelections((prev) => ({ ...prev, [item.id]: e.target.checked ? 1 : 0 }))
                      }
                      className="w-4 h-4 accent-purple-500"
                    />
                    {item.name}
                  </label>
                  {(setSelections[item.id] ?? 0) > 0 && (
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={setSelections[item.id]}
                      onChange={(e) =>
                        setSetSelections((prev) => ({ ...prev, [item.id]: parseInt(e.target.value, 10) || 1 }))
                      }
                      className="w-14 border border-purple-200 rounded-lg px-2 py-1 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button className="mt-3" onClick={addItem}>
          Add item
        </Button>
      </section>

      <section>
        <h2 className="font-display font-semibold mb-2">Menu items</h2>
        <div className="space-y-2">
          {data.items.map((item) => (
            <div key={item.id} className="bg-white border-2 border-neutral-100 rounded-2xl p-3 shadow-card">
              <div className="flex items-center gap-3">
                {item.photo_url && <img src={item.photo_url} alt={item.name} className="w-12 h-12 rounded-xl object-cover" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold flex items-center gap-1.5 flex-wrap">
                    {item.name}
                    {Boolean(item.is_recommended) && <span className="text-[10px] bg-accent-100 text-accent-600 px-1.5 py-0.5 rounded-full font-bold">⭐</span>}
                    {Boolean(item.is_set) && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full font-bold">🎁</span>}
                    {item.discount_percent > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">-{item.discount_percent}%</span>}
                  </p>
                  <p className="text-xs text-neutral-500">{formatPrice(item.price_cents)}</p>
                </div>
                <label className="text-xs text-brand-600 font-semibold cursor-pointer">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto(item.id, e.target.files[0])}
                  />
                </label>
                <Button variant="danger" className="text-xs" onClick={() => deleteItem(item.id)}>
                  Delete
                </Button>
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-neutral-100">
                <Button
                  variant={item.is_recommended ? "secondary" : "ghost"}
                  className="text-xs"
                  onClick={() => toggleRecommended(item.id, item.is_recommended)}
                >
                  {item.is_recommended ? "★ Recommended" : "☆ Recommend"}
                </Button>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-neutral-500">Discount %:</span>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    defaultValue={item.discount_percent}
                    onBlur={(e) => setDiscount(item.id, e.target.value)}
                    className="w-14 border border-neutral-200 rounded-lg px-2 py-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
