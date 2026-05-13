"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@techorbit/ui";
import { AuthCard } from "@/components/auth/auth-card";
import { FormField } from "@/components/auth/form-field";
import { useAuth } from "@/lib/auth-hooks";

type Role = "CUSTOMER" | "CANDIDATE" | "CRM" | "SRM" | "MSME";

import { ROLE_ICON_COMPONENT } from "@/components/icons";

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: "CUSTOMER", label: "Customer", description: "I'm hiring IT consultants for my company." },
  { value: "CANDIDATE", label: "Candidate", description: "I'm a consultant looking for work." },
  { value: "CRM", label: "Client Relationship Manager", description: "I bring clients to the platform." },
  { value: "SRM", label: "Senior Recruitment Manager", description: "I source and submit candidates." },
  { value: "MSME", label: "Vendor (MSME)", description: "I manage a team of benched consultants." },
];

const ONBOARDING_ROUTES: Partial<Record<Role, string>> = {
  CUSTOMER: "/onboarding/customer",
  CANDIDATE: "/onboarding/candidate",
  CRM: "/onboarding/crm",
  SRM: "/onboarding/srm",
  MSME: "/onboarding/msme",
};

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
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [addingRole, setAddingRole] = useState(false);
  const router = useRouter();

  const { register: registerField, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: RegisterFormData) => {
    if (!selectedRole) {
      setRoleError("Please select a role to continue.");
      return;
    }
    setRoleError(null);
    auth.clearError();
    try {
      await auth.register(data.email, data.password, data.firstName, data.lastName);
      // Auto-add the chosen role and push into role-specific onboarding.
      setAddingRole(true);
      try {
        await auth.addRole(selectedRole);
      } catch {
        // If role add fails, user is still registered — let them add via profile.
      } finally {
        setAddingRole(false);
      }
      const nextRoute = ONBOARDING_ROUTES[selectedRole] ?? "/techforce/dashboard";
      router.replace(nextRoute);
    } catch {
      // Error handled in store
    }
  };

  return (
    <AuthCard
      title="Create account"
      subtitle="Join Techorbit — pick the role that fits what you want to do."
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
      {roleError && (
        <div className="mb-4 p-3 rounded-lg bg-warning/10 text-warning text-sm border border-warning/30" role="alert">
          {roleError}
        </div>
      )}

      {/* Role picker */}
      <div className="mb-6">
        <label className="text-sm font-medium text-forest-800 block mb-2">I&apos;m joining as…</label>
        <div className="grid grid-cols-2 gap-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setSelectedRole(r.value); setRoleError(null); }}
              className={`text-left rounded-lg border p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-forest-500/40 ${
                selectedRole === r.value
                  ? "border-forest-700 bg-forest-50 ring-1 ring-forest-700"
                  : "border-surface-border bg-surface hover:border-forest-300"
              }`}
            >
              <div className="flex items-start gap-2">
                {(() => {
                  const RoleIcon = ROLE_ICON_COMPONENT[r.value];
                  return RoleIcon ? (
                    <span className="shrink-0 text-forest-700 mt-0.5">
                      <RoleIcon size={18} />
                    </span>
                  ) : null;
                })()}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-forest-900">{r.label}</p>
                  <p className="text-[11px] text-sage-600 mt-0.5 leading-snug">{r.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <FormField<RegisterFormData>
            label="First name"
            name="firstName"
            type="text"
            placeholder="Jane"
            autoComplete="given-name"
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
          disabled={auth.status === "loading" || isSubmitting || addingRole}
        >
          {addingRole
            ? "Setting up your role…"
            : auth.status === "loading"
              ? "Creating account..."
              : `Create account${selectedRole ? ` as ${ROLES.find((r) => r.value === selectedRole)?.label}` : ""}`}
        </Button>
      </form>
    </AuthCard>
  );
}
