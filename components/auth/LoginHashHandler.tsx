"use client";

import { useEffect } from "react";

export function LoginHashHandler() {
  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const type = params.get("type");

    if (accessToken && type === "signup") {
      window.location.replace("/login?confirmed=1");
      return;
    }

    if (accessToken) {
      window.location.replace("/login");
    }
  }, []);

  return null;
}
