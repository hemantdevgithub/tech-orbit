import { AppShell } from "@/components/app-shell";

export default function RosterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
