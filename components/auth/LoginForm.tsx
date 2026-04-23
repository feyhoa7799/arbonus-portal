"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  blocked?: boolean;
  confirmed?: boolean;
  reset?: boolean;
};

export function LoginForm({ blocked, confirmed, reset }: Props) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError("Не удалось войти. Проверьте email, пароль и подтверждение почты.");
      setBusy(false);
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        АртРест Бонус
      </div>

      <h1>Вход в портал</h1>
      <p>
        Войдите по email и паролю. Доступ открыт только сотрудникам из белого списка.
      </p>

      {blocked ? (
        <div className="status-box status-box--error">
          Доступ отключен. Логин не найден в текущем белом списке или учетная запись заблокирована.
        </div>
      ) : null}

      {confirmed ? (
        <div className="status-box status-box--success">
          Почта подтверждена. Теперь можно войти.
        </div>
      ) : null}

      {reset ? (
        <div className="status-box status-box--success">
          Пароль обновлен. Теперь можно войти с новым паролем.
        </div>
      ) : null}

      {error ? <div className="status-box status-box--error">{error}</div> : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password">Пароль</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Введите пароль"
            required
          />
        </div>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Входим..." : "Войти"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/register">Нет аккаунта? Зарегистрироваться</Link>
        <Link href="/forgot-password">Забыли пароль?</Link>
      </div>
    </div>
  );
}
