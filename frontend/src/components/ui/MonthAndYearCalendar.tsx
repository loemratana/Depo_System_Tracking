"use client";

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthAndYearCalendarProps {
  onClose?: () => void;
}

const MonthAndYearCalendar = ({ onClose }: MonthAndYearCalendarProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  const setLast7Days = () => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    setDateRange({ from, to });
    onClose?.(); // close popover after applying preset
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    // DO NOT close popover – user can click outside or use a separate "Apply" button
  };

  const handleCalendarChange = (value: string, onChange: (...event: any[]) => void) => {
    const syntheticEvent = {
      target: { value },
    } as React.ChangeEvent<HTMLSelectElement>;
    onChange(syntheticEvent);
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={setLast7Days}>
          Last 7 days
        </Button>
      </div>

      <Card className="p-0">
        <CardContent className="p-0">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleRangeSelect}
            captionLayout="dropdown"
            classNames={{ month_caption: "mx-0" }}
            components={{
              Dropdown: (props) => (
                <Select
                  onValueChange={(value) =>
                    props.onChange && handleCalendarChange(value, props.onChange)
                  }
                  value={String(props.value)}
                >
                  <SelectTrigger className="first:grow">
                    <SelectValue>
                      {props.options?.find((opt) => opt.value === props.value)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {props.options?.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            }}
            defaultMonth={new Date()}
            hideNavigation
            startMonth={new Date(1980, 6)}
          />
        </CardContent>
      </Card>

      {dateRange?.from && dateRange?.to && (
        <p className="mt-2 text-sm text-muted-foreground">
          Selected: {dateRange.from.toLocaleDateString()} –{" "}
          {dateRange.to.toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

export default MonthAndYearCalendar;