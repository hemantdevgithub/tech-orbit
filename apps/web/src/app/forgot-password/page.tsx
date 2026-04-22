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

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setServerError(null);
    try {
      await requestPasswordReset(data.email);
      setSubmitted(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (submitted) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="If an account exists, we sent a password reset link."
        footer={
          <p className="text-sm text-sage-600 text-center">
            Remember your password?{" "}
            <Link href="/login" className="text-forest-800 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <p className="text-sage-600 text-sm">
          Click the link in the email to reset your password. The link expires in 15 minutes.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <p className="text-sm text-sage-600 text-center">
          Remember your password?{" "}
          <Link href="/login" className="text-forest-800 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
          {serverError}
        </div>
      )}

      <form onSubmit={void handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField<ForgotFormData>
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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
