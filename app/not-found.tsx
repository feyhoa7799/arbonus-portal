export default function NotFoundPage() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand-chip">
          <span className="brand-dot" />
          АртРест Бонус
        </div>
        <h1>Страница не найдена</h1>
        <p>Похоже, ссылка ушла не туда. Вернитесь на вход и откройте портал заново.</p>
        <div className="auth-links">
          <a href="/login">Перейти на вход</a>
        </div>
      </div>
    </div>
  );
}
