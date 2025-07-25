import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface InlineEditFieldProps {
  value: string | number | null | undefined;
  onSave: (value: string | number) => void;
  type?: 'text' | 'number' | 'select' | 'textarea' | 'date';
  options?: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  displayValue?: string;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  className = '',
  displayValue
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const [dateValue, setDateValue] = useState<Date | undefined>(
    value ? new Date(value.toString()) : undefined
  );

  const handleSave = () => {
    if (type === 'date' && dateValue) {
      onSave(dateValue.toISOString().split('T')[0]);
    } else if (type === 'number') {
      onSave(Number(editValue) || 0);
    } else {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value?.toString() || '');
    setDateValue(value ? new Date(value.toString()) : undefined);
    setIsEditing(false);
  };

  const renderEditField = () => {
    switch (type) {
      case 'select':
        return (
          <Select value={editValue} onValueChange={setEditValue}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-md z-50">
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="min-h-[60px] resize-none"
            autoFocus
          />
        );
      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-8",
                  !dateValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(dateValue, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background border border-border shadow-md z-50" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={setDateValue}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="h-8"
            autoFocus
          />
        );
      default:
        return (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            className="h-8"
            autoFocus
          />
        );
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1">
          {renderEditField()}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={handleSave} className="h-7 w-7 p-0">
            <Check className="h-3 w-3 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 w-7 p-0">
            <X className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer hover:bg-accent/50 px-2 py-1 rounded transition-colors",
        className
      )}
      onClick={() => {
        setIsEditing(true);
        setEditValue(value?.toString() || '');
      }}
      title="Click to edit"
    >
      {displayValue || value || <span className="text-muted-foreground italic">Click to add</span>}
    </div>
  );
};