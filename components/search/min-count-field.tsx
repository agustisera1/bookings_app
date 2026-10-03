import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/common/field";

const COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;
const COUNT_ITEMS = {
  any: "Any",
  ...Object.fromEntries(COUNT_OPTIONS.map((n) => [String(n), `${n}+`])),
};

export function MinCountField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <FormField label={label} htmlFor={id}>
      <Select
        items={COUNT_ITEMS}
        value={value == null ? "any" : String(value)}
        onValueChange={(v) => onChange(v === "any" ? null : Number(v))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {COUNT_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}+
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
