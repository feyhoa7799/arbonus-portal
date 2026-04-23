# Arbonus Portal

Готовый стартовый проект закрытого корпоративного портала на **Next.js + Supabase + Docker**.

Что уже входит в комплект:

- закрытая авторизация с доступом только по белому списку `UID`
- регистрация через email + пароль + подтверждение почты
- Cloudflare Turnstile на регистрации
- импорт белого списка из Excel
- автоматическое отключение уволенных сотрудников при новом импорте
- защищенная выдача ресурсов
- полный импорт текущей Tilda-выгрузки внутрь проекта
- текущий Tilda-дизайн отдается как **защищенный `/portal`**, а не как публичный статический сайт

---

## Что подтверждено по исходным данным

Источник белого списка сейчас имеет лист `User accounts` и колонки:

1. `UID`
2. `First name`
3. `Middle name first letter`
4. `Last name`
5. `Store`

`UID` используется как логин сотрудника в формате вроде `abc1234`.

---

## Структура проекта

- `app/` - маршруты Next.js
- `components/` - формы и UI
- `lib/` - Supabase, проверки доступа, работа с ресурсами, Turnstile
- `scripts/` - импорт allowlist и служебные утилиты
- `supabase/schema.sql` - таблицы, индексы, bucket-ы
- `app-data/tilda-portal.html` - переработанный HTML текущего сайта
- `tilda-export/` - локальная выгрузка CSS/JS/IMG/FILES из Tilda

---

## Что важно про текущую Tilda-часть

Главная страница сайта отдается маршрутом `/portal`.

Она:
- полностью закрыта авторизацией
- использует локальные ассеты из папки `tilda-export`
- не зависит от Tilda как от хостинга

Все текущие внешние кнопки из Tilda уже переведены на единый механизм ресурсов через `/r/[slug]`.

Это значит:
- сейчас они могут вести на внешние URL
- позже тот же `slug` можно перевести на файл в приватном Storage, не меняя кнопку на странице

---

## Быстрый старт

### 1. Создать репозиторий и положить туда проект
```bash
git init
git add .
git commit -m "Initial arbonus portal"
```

### 2. Создать Supabase-проект
Включить:
- Email / Password
- Confirm email
- Password recovery

### 3. Выполнить SQL
Откройте SQL Editor в Supabase и выполните файл:

`supabase/schema.sql`

После этого создадутся:
- `employee_allowlist`
- `employee_accounts`
- `protected_resources`
- приватные storage buckets

### 4. Настроить SMTP в Supabase
Нужно для:
- подтверждения почты
- восстановления пароля
- смены email

### 5. Настроить Cloudflare Turnstile
Создайте site key и secret key.

### 6. Заполнить `.env.production`
Скопируйте `.env.example` в `.env.production` и заполните значениями.

### 7. Установить зависимости локально
```bash
npm install
```

### 8. Засеять текущие ресурсы из Tilda
```bash
npm run seed:resources
```

### 9. Положить Excel на сервер
Файл белого списка должен лежать по пути:

```bash
/opt/arbonus/import/allowlist.xlsx
```

Если хотите тестово локально:
```bash
mkdir -p /opt/arbonus/import
cp "UserAccounts (23).xlsx" /opt/arbonus/import/allowlist.xlsx
```

### 10. Импортировать allowlist
```bash
npm run import:allowlist -- /opt/arbonus/import/allowlist.xlsx
```

### 11. Собрать и запустить через Docker
```bash
docker compose build
docker compose up -d
```

---

## Порядок работы в проде

### Еженедельное обновление белого списка
1. Получаете свежий Excel
2. Кладете его в `/opt/arbonus/import/allowlist.xlsx`
3. Выполняете:

```bash
docker exec arbonus-app npm run import:allowlist -- /data/import/allowlist.xlsx
```

Что произойдет:
- новые сотрудники попадут в allowlist
- существующие обновятся
- те, кого больше нет в Excel, получат `is_active = false`
- их доступ в `employee_accounts` будет отключен

---

## Как перевести кнопки с внешних облаков на приватные файлы

Сейчас многие ресурсы засеяны как `external_link`.
Чтобы перевести кнопку на настоящий приватный файл:

1. Скопируйте файл локально
2. Выполните:

```bash
npm run upload:resource -- bonus-rating ./local/path/rating.pdf application/pdf
```

Где:
- `bonus-rating` - slug ресурса
- второй аргумент - путь к локальному файлу
- третий аргумент - MIME type

После этого тот же slug начнет открывать файл уже из приватного `site-private-files`.

---

## Маршруты

### Публичные
- `/login`
- `/register`
- `/confirm-email`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`

### Закрытые
- `/portal`
- `/profile`
- `/r/[slug]`
- `/portal-assets/[...path]`

---

## Важные замечания

### 1. Публичная регистрация в Supabase
Да, сам Supabase Auth технически может быть включен на signup.
Но доступ к порталу все равно получает только тот, кто:
- есть в `employee_allowlist`
- успешно подтвердил email
- имеет активную запись в `employee_accounts`

То есть случайный signup не дает доступ к порталу.

### 2. Все чувствительные файлы
Нельзя класть в `public/`.
Для них используйте:
- `site-private-files`
- `site-private-media`
- и маршрут `/r/[slug]`

### 3. Портал из Tilda сейчас завернут в защищенный HTML
Это быстрый и безопасный старт.
Потом можно поэтапно заменять Tilda-фрагменты на нативные React-компоненты, не ломая архитектуру доступа.

---

## Что делать дальше

После первого запуска рекомендую такой порядок:

1. поднять auth
2. импортировать allowlist
3. проверить регистрацию реальным тестовым UID
4. открыть `/portal`
5. прогнать все кнопки
6. начать переносить cloud-ресурсы в приватное storage
7. потом уже точечно переписывать отдельные Tilda-блоки в React

