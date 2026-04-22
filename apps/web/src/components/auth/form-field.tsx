"use client";

import type { UseFormRegister, FieldErrors, Path } from "react-hook-form";
import { Input } from "@techorbit/ui";

export interface FormFieldProps<T extends Record<string, unknown>> {
  label: string;
  name: Path<T>;
  type?: "text" | "email" | "password" | "tel";
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  helperText?: string;
}

export function FormField<T extends Record<string, unknown>>({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  autoFocus,
  required,
  register,
  errors,
  helperText,
}: FormFieldProps<T>) {
  const error = (errors[name]?.message as string) ?? undefined;

  return (
    <Input
      label={label}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      required={required}
      error={error}
      helperText={!error ? helperText : undefined}
      {...register(name)}
    />
  );
}