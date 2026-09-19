import { apiFetch } from "../client";
import type { Category, MenuItem } from "../../types";

export const menuApi = {
  list: () => apiFetch<{ categories: Category[]; items: MenuItem[] }>("/menu"),
};
