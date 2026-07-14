"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { format, parse } from "date-fns";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const DATE_FORMAT = "yyyy-MM-dd";

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, DATE_FORMAT, new Date());
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

function DatePicker({
  value,
  id,
  onChange,
  placeholder = "Select date",
  disabled,
  invalid,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "w-full justify-between font-normal",
            invalid && "border-destructive",
            className,
          )}
        >
          {selected ? selected.toLocaleDateString() : placeholder}
          <CalendarDays className="h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[1100] w-auto overflow-hidden p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, DATE_FORMAT) : "");
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

export { DatePicker };
