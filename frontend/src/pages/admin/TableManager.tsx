import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/endpoints/admin";
import { Button } from "../../components/Button";

export function TableManager() {
  const queryClient = useQueryClient();
  const { data: tables } = useQuery({ queryKey: ["admin", "tables"], queryFn: adminApi.listTables });
  const [label, setLabel] = useState("");

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "tables"] });
  }

  async function addTable() {
    if (!label.trim()) return;
    await adminApi.createTable(label.trim());
    setLabel("");
    invalidate();
  }

  async function remove(id: string) {
    await adminApi.deleteTable(id);
    invalidate();
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white border border-neutral-200 rounded-xl p-4 flex gap-2">
        <input
          placeholder="Table label (e.g. Table 5)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm"
        />
        <Button onClick={addTable}>Add table</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables?.map((t) => (
          <div key={t.id} className="bg-white border border-neutral-200 rounded-xl p-3 text-center">
            <p className="font-medium mb-2">{t.label}</p>
            <img src={adminApi.qrImageUrl(t.id)} alt={`QR for ${t.label}`} className="mx-auto w-32 h-32" />
            <Button variant="danger" className="text-xs mt-2" onClick={() => remove(t.id)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
