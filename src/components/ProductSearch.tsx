import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CatalogProduct {
  id: string;
  wc_id: number;
  name: string;
  description: string;
  short_description: string;
  price: number;
  sku: string;
  image_url: string;
}

interface Props {
  onSelect: (product: CatalogProduct) => void;
}

const ProductSearch = ({ onSelect }: Props) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      const term = `%${query.trim()}%`;
      const { data, error } = await supabase
        .from("products")
        .select("id, wc_id, name, description, short_description, price, sku, image_url")
        .eq("active", true)
        .or(`name.ilike.${term},sku.ilike.${term}`)
        .order("name")
        .limit(15);
      setSearching(false);
      if (error) {
        toast({ title: "Search failed", description: error.message, variant: "destructive" });
        return;
      }
      setResults((data ?? []) as CatalogProduct[]);
      setOpen(true);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, toast]);

  const handleSync = async () => {
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke("sync-woocommerce-products");
    setSyncing(false);
    if (error) {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Catalog synced",
      description: `${(data as any)?.synced ?? 0} products updated`,
    });
  };

  const placeholder = useMemo(
    () => "Search products by name or SKU…",
    [],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="pl-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}

          {open && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-80 overflow-auto rounded-md border bg-popover shadow-md">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(p);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-10 w-10 rounded object-cover border"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    {p.sku && (
                      <div className="text-xs text-muted-foreground truncate">SKU: {p.sku}</div>
                    )}
                  </div>
                  <div className="text-sm font-semibold">
                    KES {Number(p.price).toLocaleString()}
                  </div>
                </button>
              ))}
            </div>
          )}
          {open && !searching && query && results.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
              No matches. Try syncing the catalog.
            </div>
          )}
        </div>
        <Button type="button" variant="outline" onClick={handleSync} disabled={syncing} className="w-full sm:w-auto shrink-0">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sync catalog"}
        </Button>
      </div>
    </div>
  );
};

export default ProductSearch;
