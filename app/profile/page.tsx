import { assertPortalAccess } from "@/lib/auth-guards";
import { ProfileCard } from "@/components/profile/ProfileCard";

export default async function ProfilePage() {
  const access = await assertPortalAccess();

  return (
    <div className="profile-shell">
      <ProfileCard
        email={access.user.email ?? ""}
        uid={access.allowlist.uid}
        displayName={access.allowlist.display_name}
        storeName={access.allowlist.store_name}
      />
    </div>
  );
}
