"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@techorbit/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/auth/form-field";
import { useAuth } from "@/lib/auth-hooks";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const searchParams = useSearchParams();
  const { login, status, error, clearError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const registered = searchParams.get("registered") === "true";
  const resetSuccess = searchParams.get("reset") === "true";

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    try {
      await login(data.email, data.password);
    } catch {
      // Error is set in store
    }
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back! Enter your credentials to continue."
      footer={
        <p className="text-sm text-sage-600 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-forest-800 font-medium hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      {registered && (
        <div className="mb-4 p-3 rounded-lg bg-mint-100 text-forest-800 text-sm">
          Account created successfully! Please sign in.
        </div>
      )}
      {resetSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-mint-100 text-forest-800 text-sm">
          Password reset successfully! Please sign in with your new password.
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField<LoginFormData>
          label="Email address"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          required
          register={register}
          errors={errors}
        />

        <div className="relative">
          <FormField<LoginFormData>
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            register={register}
            errors={errors}
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

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-forest-800 hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={status === "loading" || isSubmitting}
        >
          {status === "loading" ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <p className="text-sage-600">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
