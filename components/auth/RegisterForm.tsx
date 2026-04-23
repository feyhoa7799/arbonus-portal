"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        },
      ) => void;
      reset: (element?: HTMLElement) => void;
    };
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

function TurnstileWidget({
  onTokenChange,
  onLoadError,
}: {
  onTokenChange: (value: string) => void;
  onLoadError: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || loaded || !TURNSTILE_SITE_KEY) {
      return;
    }

    const existing = document.getElementById("cf-turnstile-script");
    if (existing) {
      setLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.id = "cf-turnstile-script";
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => onLoadError();
    document.head.appendChild(script);
  }, [loaded, onLoadError]);

  useEffect(() => {
    if (!loaded || typeof window === "undefined" || !window.turnstile) {
      return;
    }

    const element = document.getElementById("turnstile-widget");
    if (!element || element.dataset.rendered === "1") {
      return;
    }

    element.dataset.rendered = "1";

    window.turnstile.render(element, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(""),
      "error-callback": () => {
        onTokenChange("");
        onLoadError();
      },
    });
  }, [loaded, onTokenChange, onLoadError]);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <div className="status-box status-box--error">
        Не задан NEXT_PUBLIC_TURNSTILE_SITE_KEY.
      </div>
    );
  }

  return <div id="turnstile-widget" />;
}

export function RegisterForm() {
  const router = useRouter();

  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileLoadFailed, setTurnstileLoadFailed] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccessMessage("");

    if (!turnstileToken) {
      setError("Капча не прошла проверку. Обновите страницу и попробуйте снова.");
      setBusy(false);
      return;
    }

    const precheckResponse = await fetch("/api/auth/register/precheck", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        uid,
        email,
        turnstileToken,
      }),
    });

    const precheckPayload = await precheckResponse.json().catch(() => null);

    if (!precheckResponse.ok) {
      setError(precheckPayload?.error ?? "Не удалось проверить логин и капчу.");
      setBusy(false);
      return;
    }

    const supabase = getBrowserSupabase();

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/portal`,
        data: {
          uid: uid.trim().toLowerCase(),
        },
      },
    });

    if (error) {
      setError(error.message || "Не удалось создать учетную запись.");
      setBusy(false);
      return;
    }

    setSuccessMessage("Аккаунт создан. Подтвердите почту через письмо и затем войдите.");
    router.push(`/confirm-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    router.refresh();
  }

  return (
    <div className="auth-card">
      <div className="brand-chip">
        <span className="brand-dot" />
        Арт Рест Бонус
      </div>

      <h1>Регистрация</h1>
      <p>Зарегистрироваться может только сотрудник, чей логин есть в белом списке.</p>

      {error ? <div className="status-box status-box--error">{error}</div> : null}
      {successMessage ? <div className="status-box status-box--success">{successMessage}</div> : null}

      {turnstileLoadFailed ? (
        <div className="status-box status-box--error">
          Не удалось загрузить капчу Cloudflare Turnstile. Проверьте интернет, ключи и попробуйте обновить страницу.
        </div>
      ) : null}

      <form className="form-grid" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="uid">Имя пользователя</label>
          <input
            id="uid"
            type="text"
            value={uid}
            onChange={(event) => setUid(event.target.value)}
            placeholder="abc1234"
            autoComplete="username"
            required
          />
          <small>Логин от академии</small>
        </div>

        <div className="field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="register-password">Пароль</label>
          <input
            id="register-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Придумайте пароль"
            autoComplete="new-password"
            required
          />
        </div>

        <div className="field">
          <label>Проверка безопасности</label>
          <TurnstileWidget
            onTokenChange={setTurnstileToken}
            onLoadError={() => setTurnstileLoadFailed(true)}
          />
        </div>

        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Создаем аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>

      <div className="auth-links">
        <Link href="/login" prefetch={false}>
          Уже есть аккаунт? Войти
        </Link>
      </div>
    </div>
  );
}