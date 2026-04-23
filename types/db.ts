export type AllowlistRow = {
  id: number;
  uid: string;
  first_name: string;
  middle_initial: string | null;
  last_name: string;
  display_name: string;
  store_name: string;
  is_active: boolean;
};

export type EmployeeAccountRow = {
  id: number;
  auth_user_id: string;
  uid: string;
  email: string;
  access_enabled: boolean;
  email_confirmed: boolean;
};

export type ProtectedResourceRow = {
  id: number;
  slug: string;
  title: string;
  resource_type: "file" | "external_link" | "page";
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  internal_path: string | null;
  is_active: boolean;
};
