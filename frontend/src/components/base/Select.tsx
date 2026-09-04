import { forwardRef, useId } from "react";
import type { SelectHTMLAttributes } from "react";
import { FieldLabel, FieldMessage } from "./FieldChrome";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
  error?: string;
  id?: string;
}

/** Select — UX-SPEC.md Seção 3.2: dropdown simples de opção única. */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, helperText, error, className = "", required, ...rest },
  ref,
) {
  const autoId = useId();
  const id = rest.id ?? autoId;
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        defaultValue={rest.value === undefined && rest.defaultValue === undefined ? "" : undefined}
        className={[
          "min-h-11 w-full rounded-md border bg-white px-3 py-2 text-base text-neutral-900",
          "focus-visible:outline-2 focus-visible:outline-primary",
          error ? "border-danger" : "border-neutral-300",
          "disabled:bg-neutral-100 disabled:text-neutral-400",
          className,
        ].join(" ")}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={error ? errorId : helperId} error={error} helperText={helperText} />
    </div>
  );
});
