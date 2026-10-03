"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import type { Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { datePickerTriggerClass, formatDate } from "@/lib/dates";

// `open`/`onOpenChange` are optional, to chain sibling pickers ("until" right after "from").
export function DatePicker({
  value,
  onSelect,
  open,
  onOpenChange,
  disabled,
  defaultMonth,
  placeholder = "Add date",
  id,
}: {
  value: Date | undefined;
  onSelect: (date?: Date) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: Matcher | Matcher[];
  defaultMonth?: Date;
  placeholder?: string;
  id?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger id={id} className={datePickerTriggerClass(!!value)}>
        <span className="inline-flex items-center gap-2">
          <CalendarIcon className="size-4 shrink-0" />
          {value ? formatDate(value) : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onSelect}
          disabled={disabled}
          defaultMonth={defaultMonth ?? value}
        />
      </PopoverContent>
    </Popover>
  );
}
