import { useState } from "react";
import type { MenuItem, SelectedAddon } from "../../types";
import { effectivePriceCents } from "../../types";
import { Button } from "../../components/Button";
import { MAX_ITEM_QUANTITY } from "./CartContext";

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AddonModal({
  item,
  allItems,
  onClose,
  onConfirm,
}: {
  item: MenuItem;
  allItems: MenuItem[];
  onClose: () => void;
  onConfirm: (selected: SelectedAddon[], quantity: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, SelectedAddon>>({});
  const [quantity, setQuantity] = useState(1);

  function choose(groupName: string, optionLabel: string, priceCents: number) {
    setChoices((prev) => ({ ...prev, [groupName]: { group_name: groupName, option_label: optionLabel, price_cents: priceCents } }));
  }

  const requiredGroups = item.addon_groups.filter((g) => g.required);
  const canConfirm = requiredGroups.every((g) => choices[g.name]);

  const hasDiscount = item.discount_percent > 0;
  const basePrice = effectivePriceCents(item.price_cents, item.discount_percent);
  const addonsTotal = Object.values(choices).reduce((s, a) => s + a.price_cents, 0);
  const lineTotal = (basePrice + addonsTotal) * quantity;

  const setContents = item.is_set
    ? item.set_items
        .map((ref) => {
          const included = allItems.find((i) => i.id === ref.menu_item_id);
          return included ? `${ref.quantity}× ${included.name}` : null;
        })
        .filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-20 animate-fade-in-up" style={{ animationDuration: "0.2s" }}>
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-5 animate-pop-in">
        {item.photo_url && (
          <img src={item.photo_url} alt={item.name} className="w-full h-40 rounded-2xl object-cover mb-3" />
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <h2 className="text-lg font-display font-semibold">{item.name}</h2>
          {Boolean(item.is_recommended) && (
            <span className="text-[10px] font-bold bg-accent-100 text-accent-600 px-1.5 py-0.5 rounded-full">
              ⭐ Recommended
            </span>
          )}
          {hasDiscount && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
              -{item.discount_percent}% OFF
            </span>
          )}
        </div>
        <p className="text-sm text-neutral-500 mt-1">{item.description}</p>

        {setContents.length > 0 && (
          <div className="mt-2 bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
            <p className="text-xs font-semibold text-purple-600">🎁 This combo includes:</p>
            <p className="text-xs text-purple-500">{setContents.join(", ")}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <p className="text-lg font-bold text-brand-600">{formatPrice(basePrice)}</p>
          {hasDiscount && <p className="text-sm text-neutral-400 line-through">{formatPrice(item.price_cents)}</p>}
        </div>

        {item.addon_groups.map((group) => (
          <div key={group.name} className="mt-4">
            <p className="text-sm font-medium">
              {group.name} {group.required && <span className="text-red-500">*</span>}
            </p>
            <div className="mt-2 space-y-1">
              {group.options.map((opt) => (
                <label key={opt.label} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-neutral-50 cursor-pointer">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={group.name}
                      checked={choices[group.name]?.option_label === opt.label}
                      onChange={() => choose(group.name, opt.label, opt.price_cents)}
                    />
                    {opt.label}
                  </span>
                  {opt.price_cents > 0 && <span className="text-neutral-500">+{formatPrice(opt.price_cents)}</span>}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-5 flex items-center gap-3">
          <button
            className="w-8 h-8 rounded-full border-2 border-neutral-200 text-lg"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-6 text-center font-semibold">{quantity}</span>
          <button
            className="w-8 h-8 rounded-full border-2 border-neutral-200 text-lg disabled:opacity-40"
            disabled={quantity >= MAX_ITEM_QUANTITY}
            onClick={() => setQuantity((q) => Math.min(MAX_ITEM_QUANTITY, q + 1))}
          >
            +
          </button>
          <span className="ml-auto font-bold text-brand-600">{formatPrice(lineTotal)}</span>
        </div>
        {quantity >= MAX_ITEM_QUANTITY && <p className="text-xs text-neutral-400 mt-1">Max {MAX_ITEM_QUANTITY} per order</p>}

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={!canConfirm}
            onClick={() => onConfirm(Object.values(choices), quantity)}
          >
            Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
}
