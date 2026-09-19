import { Router } from "express";
import { menuRepository, type MenuItemRow } from "../repositories/menuRepository.js";

export const menuRouter = Router();

function serialize(item: MenuItemRow) {
  return { ...item, addon_groups: JSON.parse(item.addon_groups), set_items: JSON.parse(item.set_items) };
}

menuRouter.get("/", async (_req, res) => {
  const [categories, items] = await Promise.all([
    menuRepository.listCategories(),
    menuRepository.listItems({ onlyAvailable: false }),
  ]);
  res.json({ categories, items: items.map(serialize) });
});

menuRouter.get("/items/:id", async (req, res) => {
  const item = await menuRepository.findItem(req.params.id);
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(serialize(item));
});
