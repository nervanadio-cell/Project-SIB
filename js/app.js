const config = window.SITE_CONFIG || {};
let ready = false;
let db = null;
let connectionPromise = null;

function loadLibrary(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const timer = setTimeout(() => {
            script.remove();
            reject(new Error("Тайм-аут загрузки"));
        }, 7000);
        script.src = url;
        script.onload = () => {
            clearTimeout(timer);
            if (window.supabase?.createClient) resolve();
            else reject(new Error("Библиотека не запустилась"));
        };
        script.onerror = () => {
            clearTimeout(timer);
            script.remove();
            reject(new Error("Библиотека недоступна"));
        };
        document.head.append(script);
    });
}

async function connect() {
    if (ready) return db;
    if (connectionPromise) return connectionPromise;
    connectionPromise = (async () => {
        if (!config.url || !config.key) throw new Error("Настройки сайта устарели. Обновите страницу с очисткой кеша.");
        if (!window.supabase?.createClient) {
            const sources = [
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
                "https://unpkg.com/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
                "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js"
            ];
            for (const url of sources) {
                try {
                    await loadLibrary(url);
                    break;
                } catch (error) {
                    if (window.supabase?.createClient) break;
                }
            }
        }
        if (!window.supabase?.createClient) throw new Error("Библиотека Supabase не загрузилась. Проверьте сеть или блокировщик.");
        db = window.supabase.createClient(config.url, config.key);
        ready = true;
        return db;
    })().catch(error => { connectionPromise = null; throw error; });
    return connectionPromise;
}
let currentUser = null;
let mode = "login";
let recoveryEmail = "";

const $ = id => document.getElementById(id);
const authMessage = text => $("auth-message").textContent = text;
const reviewMessage = text => $("review-status").textContent = text;

function showMode(next) {
    mode = next;
    $("auth-form").hidden = next !== "login" && next !== "register";
    $("recover-form").hidden = next !== "recover";
    $("reset-form").hidden = next !== "reset";
    $("auth-name").hidden = next !== "register";
    $("name-label").hidden = next !== "register";
    $("auth-name").required = next === "register";
    $("auth-password").autocomplete = next === "register" ? "new-password" : "current-password";
    $("auth-title").textContent = {
        login: "Вход", register: "Регистрация",
        recover: "Восстановление пароля", reset: "Новый пароль"
    }[next];
    $("auth-submit").textContent = next === "register" ? "Зарегистрироваться" : "Войти";
    $("switch-auth").textContent = next === "register" ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация";
    $("switch-auth").hidden = next === "reset";
    $("forgot-password").hidden = next === "reset" || next === "recover";
    authMessage("");
}

function openModal(next = "login") {
    showMode(next);
    $("auth-modal").hidden = false;
    if (!ready) authMessage("Подключаю сервер...");
}

function closeModal() {
    $("auth-modal").hidden = true;
}

function showUser() {
    $("auth-button").hidden = Boolean(currentUser);
    $("logout-button").hidden = !currentUser;
    $("review-form").hidden = !currentUser;
    $("review-hint").hidden = Boolean(currentUser);
}

function showReviews(rows) {
    const list = $("review-list");
    list.replaceChildren();
    if (!rows.length) {
        list.textContent = "Пока отзывов нет. Будьте первым!";
        return;
    }
    for (const row of rows) {
        const item = document.createElement("article");
        const name = document.createElement("strong");
        const date = document.createElement("time");
        const text = document.createElement("p");
        item.className = "review";
        name.textContent = row.author_name;
        date.dateTime = row.created_at;
        date.textContent = new Date(row.created_at).toLocaleDateString("ru-RU");
        text.textContent = row.body;
        item.append(name, date, text);
        list.append(item);
    }
}

async function loadReviews() {
    try { await connect(); }
    catch (error) {
        $("review-list").textContent = "Не удалось подключить отзывы: " + error.message;
        return;
    }
    const { data, error } = await db.from("comments")
        .select("author_name, body, created_at")
        .order("created_at", { ascending: false }).limit(40);
    if (error) reviewMessage("Не удалось загрузить отзывы. Проверьте SQL-настройку.");
    else {
        reviewMessage("");
        showReviews(data || []);
    }
}

$("auth-button").addEventListener("click", () => openModal());
$("close-modal").addEventListener("click", closeModal);
$("auth-modal").addEventListener("click", event => {
    if (event.target === $("auth-modal")) closeModal();
});
document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});
$("switch-auth").addEventListener("click", () => showMode(mode === "register" ? "login" : "register"));
$("forgot-password").addEventListener("click", () => showMode("recover"));

$("auth-form").addEventListener("submit", async event => {
    event.preventDefault();
    try { await connect(); } catch (error) { return authMessage(error.message); }
    const email = $("auth-email").value.trim();
    const password = $("auth-password").value;
    const button = $("auth-submit");
    button.disabled = true;
    authMessage("Проверяем данные...");
    try {
        if (mode === "register") {
            const nickname = $("auth-name").value.trim();
            if (nickname.length < 2) return authMessage("Имя должно содержать хотя бы 2 символа.");
            const options = { data: { nickname } };
            if (location.protocol === "https:") options.emailRedirectTo = location.origin + location.pathname;
            const { data, error } = await db.auth.signUp({ email, password, options });
            if (error) throw error;
            if (!data.session) authMessage("Проверьте почту и подтвердите регистрацию.");
            else {
                authMessage("Регистрация готова!");
                setTimeout(closeModal, 900);
            }
        } else {
            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) throw error;
            closeModal();
        }
    } catch (error) {
        authMessage("Ошибка: " + error.message);
    } finally {
        button.disabled = false;
    }
});

$("recover-form").addEventListener("submit", async event => {
    event.preventDefault();
    try { await connect(); } catch (error) { return authMessage(error.message); }
    recoveryEmail = $("recover-email").value.trim();
    const button = $("recover-form").querySelector("button");
    button.disabled = true;
    try {
        const { error } = await db.auth.resetPasswordForEmail(recoveryEmail);
        if (error) throw error;
        showMode("reset");
        authMessage("Если почта зарегистрирована, код отправлен. Проверьте письмо.");
    } catch (error) {
        authMessage("Ошибка: " + error.message);
    } finally {
        button.disabled = false;
    }
});

$("reset-form").addEventListener("submit", async event => {
    event.preventDefault();
    try { await connect(); } catch (error) { return authMessage(error.message); }
    const token = $("reset-code").value.trim();
    const password = $("reset-password").value;
    const button = $("reset-form").querySelector("button");
    button.disabled = true;
    try {
        const { error } = await db.auth.verifyOtp({ email: recoveryEmail, token, type: "recovery" });
        if (error) throw error;
        const result = await db.auth.updateUser({ password });
        if (result.error) throw result.error;
        $("reset-form").reset();
        showMode("login");
        authMessage("Пароль изменён. Можно войти.");
    } catch (error) {
        authMessage("Ошибка: " + error.message);
    } finally {
        button.disabled = false;
    }
});

$("logout-button").addEventListener("click", async () => {
    if (!db) return;
    const { error } = await db.auth.signOut();
    if (error) reviewMessage("Ошибка выхода: " + error.message);
});

$("review-form").addEventListener("submit", async event => {
    event.preventDefault();
    if (!currentUser) return;
    try { await connect(); } catch (error) { return reviewMessage(error.message); }
    const body = $("review-text").value.trim();
    if (body.length < 2 || body.length > 500) return reviewMessage("Отзыв: от 2 до 500 символов.");
    const nickname = String(currentUser.user_metadata.nickname || "Участник").trim().slice(0, 30);
    const button = $("review-form").querySelector("button");
    button.disabled = true;
    try {
        const { error } = await db.from("comments").insert({
            user_id: currentUser.id, author_name: nickname, body
        });
        if (error) throw error;
        $("review-text").value = "";
        await loadReviews();
        reviewMessage("Отзыв опубликован!");
    } catch (error) {
        reviewMessage("Ошибка: " + error.message);
    } finally {
        button.disabled = false;
    }
});

async function init() {
    showUser();
    try {
        await connect();
        await loadReviews();
        const { data } = await db.auth.getUser();
        currentUser = data.user;
        showUser();
        db.auth.onAuthStateChange((_event, session) => {
            currentUser = session?.user || null;
            showUser();
        });
    } catch (error) {
        reviewMessage("Не удалось подключиться: " + error.message);
    }
}
init();
