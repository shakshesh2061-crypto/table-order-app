import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { menuApi } from "../../api/endpoints/menu";
import { useCart, MAX_ITEM_QUANTITY } from "./CartContext";
import type { MenuItem } from "../../types";
import { AddonModal } from "./AddonModal";
import { MenuItemCard } from "./MenuItemCard";

const CATEGORY_EMOJI: Record<string, string> = {
  appetizers: "🥗",
  "main courses": "🍔",
  mains: "🍔",
  drinks: "🥤",
  beverages: "🥤",
  desserts: "🍰",
};

function emojiFor(categoryName: string): string {
  return CATEGORY_EMOJI[categoryName.trim().toLowerCase()] ?? "🍴";
}

export function Menu() {
  const { data, isLoading } = useQuery({ queryKey: ["menu"], queryFn: menuApi.list });
  const { addLine, lines, tableLabel } = useCart();
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);

  if (isLoading) return <div className="p-8 text-center text-neutral-500">Loading menu… 🍳</div>;
  if (!data) return null;

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const recommended = data.items.filter((i) => i.is_recommended && i.is_available);
  let cardIndex = 0;

  return (
    <div className="relative p-4 overflow-hidden">
      {/* Decorative floating background blobs — subtle, not distracting */}
      <div
        className="pointer-events-none fixed -top-10 -right-16 w-56 h-56 rounded-full bg-brand-200/40 blur-3xl animate-float-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed top-1/3 -left-20 w-64 h-64 rounded-full bg-accent-100/50 blur-3xl animate-float-slower"
        aria-hidden
      />

      <div className="relative">
        {tableLabel && (
          <div className="mb-3 text-sm font-semibold text-brand-700 bg-brand-50 border-2 border-brand-100 rounded-2xl px-3 py-2 animate-fade-in-up">
            🪑 Ordering for {tableLabel}
          </div>
        )}
        <p className="mb-3 text-xs text-neutral-400 text-center">
          Tap a dish to view details • Max {MAX_ITEM_QUANTITY} of each item per order
        </p>

        {recommended.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-display font-semibold mb-2 flex items-center gap-2">
              <span className="animate-float-slow inline-block">⭐</span> Recommended for you
            </h2>
            <div className="space-y-2">
              {recommended.map((item) => {
                const cat = data.categories.find((c) => c.id === item.category_id);
                const delay = Math.min(cardIndex++, 10) * 45;
                return (
                  <MenuItemCard
                    key={`rec-${item.id}`}
                    item={item}
                    emoji={emojiFor(cat?.name ?? "")}
                    allItems={data.items}
                    delayMs={delay}
                    onClick={() => setActiveItem(item)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {data.categories.map((cat) => {
          const items = data.items.filter((i) => i.category_id === cat.id);
          if (items.length === 0) return null;
          return (
            <section key={cat.id} className="mb-6">
              <h2 className="text-lg font-display font-semibold mb-2 flex items-center gap-2">
                <span className="animate-float-slow inline-block">{emojiFor(cat.name)}</span> {cat.name}
              </h2>
              <div className="space-y-2">
                {items.map((item) => {
                  const delay = Math.min(cardIndex++, 10) * 45;
                  return (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      emoji={emojiFor(cat.name)}
                      allItems={data.items}
                      delayMs={delay}
                      onClick={() => setActiveItem(item)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {activeItem && (
        <AddonModal
          item={activeItem}
          allItems={data.items}
          onClose={() => setActiveItem(null)}
          onConfirm={(addons, qty) => {
            addLine(activeItem, qty, addons);
            setActiveItem(null);
          }}
        />
      )}

      {itemCount > 0 && (
        <Link
          key={itemCount}
          to="/customer/cart"
          className="fixed bottom-16 inset-x-4 bg-gradient-to-r from-brand-500 to-brand-400 text-white rounded-full py-3.5 text-center font-display font-semibold text-lg animate-pop-in animate-glow-pulse"
        >
          🛒 View cart ({itemCount})
        </Link>
      )}
    </div>
  );
}
