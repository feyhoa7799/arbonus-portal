"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Props = {
  email: string;
  uid: string;
  displayName: string;
  storeName: string;
};

export function ProfileCard({ email, uid, displayName, storeName }: Props) {
  const router = useRouter();
  const supabase = getBrowserSupabase();

  const [newEmail, setNewEmail] = useState(email);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim().toLowerCase(),
    });

    if (error) {
      setError("Не удалось запустить смену email.");
      setBusy(false);
      return;
    }

    setMessage("На новый email отправлено письмо для подтверждения смены адреса.");
    setBusy(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="profile-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        АртРест Бонус
      </div>

      <h1>Профиль</h1>
      <p>Здесь можно посмотреть привязанный логин и запустить смену email.</p>

      <div className="profile-grid">
        <div className="profile-item">
          <span>Имя пользователя</span>
          <strong>{uid}</strong>
        </div>
        <div className="profile-item">
          <span>Сотрудник</span>
          <strong>{displayName}</strong>
        </div>
        <div className="profile-item">
          <span>Подразделение / ресторан</span>
          <strong>{storeName}</strong>
        </div>
        <div className="profile-item">
          <span>Текущий email</span>
          <strong>{email}</strong>
        </div>
      </div>

      {message ? <div className="status-box status-box--success">{message}</div> : null}
      {error ? <div className="status-box status-box--error">{error}</div> : null}

      <form className="form-grid" onSubmit={changeEmail}>
        <div className="field">
          <label htmlFor="new-email">Новый email</label>
          <input
            id="new-email"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <small>После смены email Supabase отправит письмо для подтверждения нового адреса.</small>
        </div>

        <div className="button-row">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Отправляем..." : "Сменить email"}
          </button>
          <button className="secondary-button" type="button" onClick={signOut}>
            Выйти
          </button>
          <a className="secondary-button" href="/portal" style={{ textDecoration: "none" }}>
            Вернуться в портал
          </a>
        </div>
      </form>
    </div>
  );
}