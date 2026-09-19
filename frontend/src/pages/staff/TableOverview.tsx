import { useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../../api/endpoints/staff";
import { menuApi } from "../../api/endpoints/menu";
import { Button } from "../../components/Button";

export function TableOverview() {
  const queryClient = useQueryClient();
  const { data: sessions } = useQuery({ queryKey: ["staff", "tables"], queryFn: staffApi.tables, refetchInterval: 30000 });
  const { data: menu } = useQuery({ queryKey: ["menu"], queryFn: menuApi.list });

  async function toggleAvailability(itemId: string, isAvailable: boolean) {
    await staffApi.setAvailability(itemId, !isAvailable);
    queryClient.invalidateQueries({ queryKey: ["menu"] });
  }

  return (
    <div className="p-4 space-y-6">
      <section>
        <h2 className="text-base font-semibold mb-2">Active tables</h2>
        {sessions && sessions.length > 0 ? (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex justify-between">
                <span className="font-medium">{s.table_label}</span>
                <span className="text-xs text-neutral-500">Since {new Date(s.started_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No active table sessions.</p>
        )}
      </section>

      <section>
        <h2 className="text-base font-semibold mb-2">Menu availability</h2>
        <div className="space-y-2">
          {menu?.items.map((item) => (
            <div key={item.id} className="bg-white border border-neutral-200 rounded-xl p-3 flex justify-between items-center">
              <span>{item.name}</span>
              <Button
                variant={item.is_available ? "ghost" : "danger"}
                className="text-xs"
                onClick={() => toggleAvailability(item.id, Boolean(item.is_available))}
              >
                {item.is_available ? "Mark out of stock" : "Mark available"}
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
