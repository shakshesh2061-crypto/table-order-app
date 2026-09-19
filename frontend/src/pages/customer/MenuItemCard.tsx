import type { MenuItem } from "../../types";
import { effectivePriceCents } from "../../types";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MenuItemCard({
  item,
  emoji,
  allItems,
  delayMs,
  onClick,
}: {
  item: MenuItem;
  emoji: string;
  allItems: MenuItem[];
  delayMs: number;
  onClick: () => void;
}) {
  const hasDiscount = item.discount_percent > 0;
  const finalPrice = effectivePriceCents(item.price_cents, item.discount_percent);
  const setContents = item.is_set
    ? item.set_items
        .map((ref) => {
          const included = allItems.find((i) => i.id === ref.menu_item_id);
          return included ? `${ref.quantity}× ${included.name}` : null;
        })
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <button
      disabled={!item.is_available}
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms` }}
      className="group relative w-full text-left bg-white border-2 border-neutral-100 rounded-2xl p-3 flex items-center gap-3 shadow-card hover:border-brand-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 animate-fade-in-up"
    >
      <div className="relative flex-shrink-0">
        {item.photo_url ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden">
            <img
              src={item.photo_url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl bg-brand-50 flex items-center justify-center text-2xl">{emoji}</div>
        )}
        {hasDiscount && (
          <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pop-in">
            -{item.discount_percent}%
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold">{item.name}</p>
          {Boolean(item.is_recommended) && (
            <span className="text-[10px] font-bold bg-accent-100 text-accent-600 px-1.5 py-0.5 rounded-full">
              ⭐ Recommended
            </span>
          )}
          {Boolean(item.is_set) && (
            <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">
              🎁 Combo
            </span>
          )}
          {!item.is_available && <span className="text-xs text-red-500">Out of stock</span>}
        </div>
        <p className="text-sm text-neutral-500">{item.description}</p>
        {setContents && <p className="text-xs text-purple-500 mt-0.5">Includes: {setContents}</p>}
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-bold text-brand-600">{formatPrice(finalPrice)}</p>
          {hasDiscount && <p className="text-xs text-neutral-400 line-through">{formatPrice(item.price_cents)}</p>}
        </div>
      </div>

      <span className="w-8 h-8 rounded-full bg-brand-500 text-white text-lg font-bold flex items-center justify-center flex-shrink-0 shadow-pop transition-transform group-hover:scale-110 group-hover:rotate-90">
        +
      </span>
    </button>
  );
}
