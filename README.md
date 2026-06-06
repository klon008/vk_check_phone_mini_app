# vk_check_phone_mini_app

VK Mini App для подтверждения номера телефона через `VKWebAppGetPhoneNumber`.

## GitHub Pages

1. **Settings → Pages → Build and deployment**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **/ (root)**
4. URL: https://klon008.github.io/vk_check_phone_mini_app/

Этот URL укажите в настройках VK Mini App на [dev.vk.com](https://dev.vk.com).

## Установка в сообщество (обязательно)

`VKWebAppSendPayload` работает **только если mini app установлено в том же сообществе**, что и бот.
Иначе VK вернёт ошибку **711**: *Application is not installed in community*.

1. [dev.vk.com](https://dev.vk.com) → приложение → **«Разрешить установку в сообществах»**
2. Сообщество бота → **Управление → Приложения → Добавить** → выберите mini app
3. Long Poll API группы: включено событие **`app_payload`**

## config.js

VK **не передаёт** `vk_group_id` при открытии из кнопки `open_app` в чате бота.
Поэтому в `config.js` укажите `groupId` — то же число, что `VK_GROUP_ID` в `.env` бота:

```powershell
Copy-Item config.example.js config.js
# отредактируйте groupId в config.js
```

## Связь с ботом

В репозитории бота `mini-app/` — симлинк на эту папку (`E:\Work\vk_check_phone_mini_app`).
Правки mini-app делаются здесь; деплой — push в этот репозиторий.

## Деплой

```powershell
git add index.html app.js config.js config.example.js README.md
git commit -m "Update mini-app"
git push
```
