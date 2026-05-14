import { AppShell } from "@/components/app-shell";

export default function InvitationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
