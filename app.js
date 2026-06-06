(function () {
  const statusEl = document.getElementById("status");
  const buttonEl = document.getElementById("verify-btn");
  let cachedGroupId = 0;

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? "status error" : "status";
  }

  function parseGroupIdFromHashValue(raw) {
    if (!raw) {
      return 0;
    }
    const value = String(raw).trim();
    const prefixed = value.match(/group_(\d+)/);
    if (prefixed) {
      return Number(prefixed[1]);
    }
    if (/^\d+$/.test(value)) {
      return Number(value);
    }
    return 0;
  }

  function readConfiguredGroupId() {
    const config = window.APP_CONFIG || {};
    return Number(config.groupId || 0);
  }

  async function getGroupId() {
    let groupId = readConfiguredGroupId();
    if (groupId) {
      return groupId;
    }

    const params = await vkBridge.send("VKWebAppGetLaunchParams");
    groupId = Number(params.vk_group_id || params.group_id || 0);
    if (groupId) {
      return groupId;
    }

    groupId = parseGroupIdFromHashValue(params.hash);
    if (groupId) {
      return groupId;
    }

    const search = new URLSearchParams(window.location.search);
    groupId = parseGroupIdFromHashValue(search.get("hash"));
    if (groupId) {
      return groupId;
    }

    groupId = Number(search.get("group_id") || search.get("vk_group_id") || 0);
    if (groupId) {
      return groupId;
    }

    groupId = parseGroupIdFromHashValue(window.location.hash.replace(/^#/, ""));
    if (groupId) {
      return groupId;
    }

    throw new Error(
      "Не удалось определить сообщество. Укажите groupId в config.js (как VK_GROUP_ID в .env бота)."
    );
  }

  async function verifyPhone() {
    buttonEl.disabled = true;
    setStatus("Запрашиваем доступ к номеру...");

    try {
      const groupId = cachedGroupId || (await getGroupId());

      const phoneData = await vkBridge.send("VKWebAppGetPhoneNumber");
      const phone = String(phoneData.phone_number || "").trim();
      const sign = String(phoneData.sign || "").trim();

      if (!phone || !sign) {
        throw new Error("VK не вернул номер телефона.");
      }

      setStatus("Отправляем данные боту...");

      await vkBridge.send("VKWebAppSendPayload", {
        group_id: groupId,
        payload: JSON.stringify({
          action: "phone_verified",
          phone: phone,
          sign: sign,
        }),
      });

      setStatus("Готово. Вернитесь в чат с ботом.");
      await vkBridge.send("VKWebAppClose", { status: "success" });
    } catch (error) {
      const message = error && error.error_data && error.error_data.error_reason
        ? error.error_data.error_reason
        : (error && error.message) || "Не удалось подтвердить номер.";
      setStatus(message, true);
      buttonEl.disabled = false;
    }
  }

  async function init() {
    try {
      await vkBridge.send("VKWebAppInit");
      cachedGroupId = await getGroupId();
      buttonEl.addEventListener("click", verifyPhone);
    } catch (error) {
      const message = (error && error.message) || "Не удалось инициализировать приложение.";
      setStatus(message, true);
      buttonEl.disabled = true;
    }
  }

  init();
})();
