"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@techorbit/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/auth/form-field";
import { useAuth } from "@/lib/auth-hooks";

const registerSchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { register: registerField, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: RegisterFormData) => {
    auth.clearError();
    try {
      await auth.register(data.email, data.password, data.firstName, data.lastName);
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthCard
      title="Create account"
      subtitle="Join Techorbit to connect with IT opportunities"
      footer={
        <p className="text-sm text-sage-600 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-forest-800 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {auth.error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
          {auth.error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <FormField<RegisterFormData>
            label="First name"
            name="firstName"
            type="text"
            placeholder="Jane"
            autoComplete="given-name"
            autoFocus
            required
            register={registerField}
            errors={errors}
          />
          <FormField<RegisterFormData>
            label="Last name"
            name="lastName"
            type="text"
            placeholder="Doe"
            autoComplete="family-name"
            required
            register={registerField}
            errors={errors}
          />
        </div>

        <FormField<RegisterFormData>
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          register={registerField}
          errors={errors}
        />

        <div className="relative">
          <FormField<RegisterFormData>
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 12 characters"
            autoComplete="new-password"
            required
            register={registerField}
            errors={errors}
            helperText="Use 12+ characters with a mix of letters, numbers, and symbols"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-sage-400 hover:text-forest-800 text-sm"
            tabIndex={-1}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <FormField<RegisterFormData>
          label="Confirm password"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          register={registerField}
          errors={errors}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={auth.status === "loading" || isSubmitting}
        >
          {auth.status === "loading" ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}