import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface AutocompleteTagInputProps {
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  disabled?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'tactical';
}

export function AutocompleteTagInput({
  values,
  onChange,
  suggestions,
  placeholder = 'Add item',
  disabled = false,
  badgeVariant = 'default',
}: AutocompleteTagInputProps) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected values
  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
      !values.includes(suggestion)
  );

  const addValue = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue && !values.includes(trimmedValue)) {
      onChange([...values, trimmedValue]);
      setInputValue('');
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const removeValue = (value: string) => {
    onChange(values.filter((v) => v !== value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
        addValue(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        addValue(inputValue);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (disabled) {
    return (
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant={badgeVariant}>
            {value}
          </Badge>
        ))}
        {values.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('common.noneListed')}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Display existing values */}
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant={badgeVariant} className="gap-1">
            {value}
            <button
              type="button"
              onClick={() => removeValue(value)}
              className="ms-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {/* Input with autocomplete */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              setHighlightedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addValue(inputValue)}
            disabled={!inputValue.trim()}
          >
            {t('common.add')}
          </Button>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                  index === highlightedIndex && 'bg-accent text-accent-foreground'
                )}
                onClick={() => addValue(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
