"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@techorbit/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@techorbit/ui";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/lib/auth-hooks";

const verifySchema = z.object({
  code: z.string().length(6, "Enter the 6-digit code").regex(/^\d{6}$/, "Must be 6 digits"),
});

type VerifyFormData = z.infer<typeof verifySchema>;

export default function Verify2FAPage() {
  const router = useRouter();
  const store = useAuthStore();
  const { verify2FA } = useAuth();
  const [resendTimer, setResendTimer] = useState(0);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerifyFormData>({
    resolver: zodResolver(verifySchema),
  });

  const code = watch("code") ?? "";

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  // Redirect if no challenge token
  if (!store.challengeToken) {
    router.replace("/login");
    return null;
  }

  const onSubmit = async (data: VerifyFormData) => {
    store.setError(null);
    try {
      await verify2FA(data.code);
    } catch {
      // Error handled in store
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setValue("code", value, { shouldValidate: true });
    if (value.length === 6) {
      void handleSubmit(onSubmit)();
    }
  };

  return (
    <AuthCard
      title="Two-factor authentication"
      subtitle="Enter the 6-digit code from your authenticator app"
      footer={
        <div className="space-y-2 text-center">
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="block w-full text-sm text-sage-600 hover:text-forest-800"
          >
            Back to sign in
          </button>
          <button
            type="button"
            disabled={resendTimer > 0}
            onClick={() => setResendTimer(30)}
            className="block w-full text-sm text-forest-800 hover:underline disabled:text-sage-400"
          >
            {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Use a different account"}
          </button>
        </div>
      }
    >
      {store.error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
          {store.error}
        </div>
      )}

      <form onSubmit={void handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <Input
          label="Verification code"
          placeholder="000000"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]*"
          error={errors.code?.message as string | undefined}
          value={code}
          onChange={handleCodeChange}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting || code.length !== 6}
        >
          {isSubmitting ? "Verifying..." : "Verify"}
        </Button>
      </form>
    </AuthCard>
  );
}
