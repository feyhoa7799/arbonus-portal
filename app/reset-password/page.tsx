import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const error = typeof params.error === "string" ? params.error : "";

  return <ResetPasswordForm error={error} />;
}
