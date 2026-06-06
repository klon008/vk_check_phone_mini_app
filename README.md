# vk_check_phone_mini_app

VK Mini App для подтверждения номера телефона через `VKWebAppGetPhoneNumber`.

## GitHub Pages

1. **Settings → Pages → Build and deployment**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **/ (root)**
4. URL: https://klon008.github.io/vk_check_phone_mini_app/

Этот URL укажите в настройках VK Mini App на [dev.vk.com](https://dev.vk.com).

## Связь с ботом

В репозитории бота `mini-app/` — симлинк на эту папку (`E:\Work\vk_check_phone_mini_app`).
Правки mini-app делаются здесь; деплой — push в этот репозиторий.

## Деплой

```powershell
git add index.html app.js
git commit -m "Update mini-app"
git push
```
