import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProductSearch({ value, onChange }: ProductSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // Synchronize local state with prop value if modified from parent (e.g., filters cleared)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the change callback
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localValue, onChange, value]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="ابحث عن اسم المنتج"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-9 w-full"
      />
    </div>
  );
}
