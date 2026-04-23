import { LoginForm } from "@/components/auth/LoginForm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const blocked = params.blocked === "1";
  const confirmed = params.confirmed === "1";
  const reset = params.reset === "1";

  return <LoginForm blocked={blocked} confirmed={confirmed} reset={reset} />;
}
