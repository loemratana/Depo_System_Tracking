import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: string[];
  required?: boolean;
}
export default function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  options,
  required,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter(
    (opt) => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value,
  );
  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        id={id}
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-9 text-sm"
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-40 overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md p-1">
          {filtered.map((opt) => (
            <div
              key={opt}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
