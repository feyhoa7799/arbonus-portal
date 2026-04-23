"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function ResetPasswordForm({ error: initialError }: { error?: string }) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      setBusy(false);
      return;
    }

    const supabase = getBrowserSupabase();

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Не удалось обновить пароль. Откройте письмо заново и повторите попытку.");
      setBusy(false);
      return;
    }

    setMessage("Пароль обновлен.");
    router.push("/login?reset=1");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        Арт Рест Бонус
      </div>

      <h1>Новый пароль</h1>
      <p>Введите новый пароль для своей учетной записи.</p>

      {message ? <div className="status-box status-box--success">{message}</div> : null}
      {error ? <div className="status-box status-box--error">{error}</div> : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="new-password">Новый пароль</label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="repeat-password">Повторите пароль</label>
          <input
            id="repeat-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Сохраняем..." : "Сохранить пароль"}
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