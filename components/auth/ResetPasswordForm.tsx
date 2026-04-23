"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const supabase = getBrowserSupabase();

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError("Не удалось отправить письмо для сброса пароля.");
      setBusy(false);
      return;
    }

    setMessage("Письмо для сброса пароля отправлено.");
    setBusy(false);
  }

  return (
    <div className="auth-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        Арт Рест Бонус
      </div>

      <h1>Сброс пароля</h1>
      <p>Введите email, на который зарегистрирован аккаунт.</p>

      {message ? <div className="status-box status-box--success">{message}</div> : null}
      {error ? <div className="status-box status-box--error">{error}</div> : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Отправляем..." : "Отправить письмо"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/login" prefetch={false}>
          Вернуться на вход
        </Link>
      </div>
    </div>
  );
}