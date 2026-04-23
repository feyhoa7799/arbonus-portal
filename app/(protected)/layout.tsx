import { assertPortalAccess } from "@/lib/auth-guards";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPortalAccess();
  return children;
}
