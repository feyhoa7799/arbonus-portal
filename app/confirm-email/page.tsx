import { ConfirmEmailCard } from "@/components/auth/ConfirmEmailCard";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConfirmEmailPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const email = typeof params.email === "string" ? params.email : "";

  return <ConfirmEmailCard email={email} />;
}
