import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/portal" : "/login");
}
