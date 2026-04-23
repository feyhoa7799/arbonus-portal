"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function ConfirmEmailCard({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const supabase = getBrowserSupabase();

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal`,
      },
    });

    if (error) {
      setError("Не удалось отправить письмо повторно.");
      setBusy(false);
      return;
    }

    setMessage("Письмо отправлено повторно.");
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        Арт Рест Бонус
      </div>

      <h1>Подтвердите почту</h1>
      <p>
        Мы отправили письмо на адрес <strong>{email || "указанный email"}</strong>. Откройте его,
        перейдите по ссылке и затем войдите в портал.
      </p>

      {message ? <div className="status-box status-box--success">{message}</div> : null}
      {error ? <div className="status-box status-box--error">{error}</div> : null}

      {email ? (
        <form className="form-grid" onSubmit={resend}>
          <button className="secondary-button" type="submit" disabled={busy}>
            {busy ? "Отправляем..." : "Отправить письмо повторно"}
          </button>
        </form>
      ) : null}

      <div className="auth-links">
        <Link href="/login" prefetch={false}>
          Вернуться ко входу
        </Link>
      </div>
    </div>
  );
}