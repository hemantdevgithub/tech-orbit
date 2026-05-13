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

const resetSchema = z
  .object({
    password: z.string().min(12, "Password must be at least 12 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { confirmPasswordReset } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  if (!token) {
    return (
      <AuthCard
        title="Invalid link"
        subtitle="This password reset link is invalid or has expired."
        footer={
          <p className="text-sm text-sage-600 text-center">
            <Link href="/forgot-password" className="text-forest-800 font-medium hover:underline">
              Request a new reset link
            </Link>
          </p>
        }
      >
        <p className="text-sage-600 text-sm">
          Please request a new password reset link from the forgot password page.
        </p>
      </AuthCard>
    );
  }

  const onSubmit = async (data: ResetFormData) => {
    await confirmPasswordReset(token, data.password);
  };

  return (
    <AuthCard
      title="Set new password"
      subtitle="Choose a strong password for your account."
      footer={
        <p className="text-sm text-sage-600 text-center">
          <Link href="/login" className="text-forest-800 font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={void handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="relative">
          <FormField<ResetFormData>
            label="New password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Minimum 12 characters"
            autoComplete="new-password"
            required
            register={register}
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

        <FormField<ResetFormData>
          label="Confirm new password"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          required
          register={register}
          errors={errors}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream-100 flex items-center justify-center">
          <p className="text-sage-600">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
