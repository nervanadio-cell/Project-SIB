# Project SIB

Учебный сайт с регистрацией и отзывами. Сохранён исходный текст о профессии, добавлены две иллюстрации и зелёная цветовая гамма.

## Где что находится
- `index.html` — текст, навигация, формы регистрации и отзывов.
- `style.css` — оформление и зелёные цвета.
- `js/app.js` — вход, регистрация, выход, комментарии, восстановление.
- `js/config.js` — публичный адрес и ключ Supabase, заполняются после создания базы.
- `sql/setup.sql` — создание таблицы комментариев и правил RLS.
- `email/recovery.html` — письмо с кодом восстановления.
- `assets/` — картинки.

## Как запустить
1. GitHub Settings → Pages → Deploy from a branch → main → /(root) → Save.
2. В Supabase создай проект и запусти `sql/setup.sql` в SQL Editor.
3. В `js/config.js` вставь Project URL и publishable key. Никогда не вставляй service_role / secret key.
4. В Supabase Authentication → URL Configuration установи Site URL = https://nervanadio-cell.github.io/Project-SIB/ и добавь его в Redirect URLs.
5. В Authentication → Email Templates → Reset Password вставь `email/recovery.html`.
6. Включи email-confirmation и настрой SMTP, если регистрация и письма должны работать для всех пользователей, не только для участников проекта.

## Что хранится
GitHub Pages показывает сайт. Supabase Auth отвечает за аккаунты и безопасно хранит пароли. Supabase PostgreSQL хранит комментарии. Комментарии публично читаются, но писать их могут только авторизованные пользователи. Без Supabase сайт откроется, но регистрация и отзывы работать не будут.
