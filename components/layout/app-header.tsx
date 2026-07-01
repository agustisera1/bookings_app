import { Separator } from "@/components/ui/separator";

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <Separator orientation="vertical" className="h-4" />
    </header>
  );
}
