(function () {
  const DEBUG = true;

  const statusEl = document.getElementById("status");
  const buttonEl = document.getElementById("verify-btn");
  let cachedGroupId = 0;
  let debugLines = [];

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? "status error" : "status";
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (error) {
      return String(value);
    }
  }

  function serializeError(error) {
    if (!error) {
      return { error: null };
    }

    if (typeof error !== "object") {
      return { value: String(error) };
    }

    const serialized = {
      name: error.name,
      message: error.message,
      type: error.type,
      error_type: error.error_type,
      stack: error.stack,
      error_data: error.error_data,
      data: error.data,
    };

    for (const key of Object.keys(error)) {
      if (!(key in serialized)) {
        serialized[key] = error[key];
      }
    }

    return serialized;
  }

  function formatDebugError(error, context, extra) {
    const parts = [];
    if (context) {
      parts.push(`context: ${context}`);
    }
    if (extra) {
      parts.push(`extra: ${safeStringify(extra)}`);
    }
    parts.push(`error: ${safeStringify(serializeError(error))}`);
    return parts.join("\n\n");
  }

  function debugLog(label, data) {
    const line = data === undefined
      ? `[${new Date().toISOString()}] ${label}`
      : `[${new Date().toISOString()}] ${label}: ${safeStringify(data)}`;
    debugLines.push(line);
    console.log(line);

    if (DEBUG) {
      setStatus(debugLines.join("\n\n"), false);
    }
  }

  function describeVkError(error) {
    const code = error && error.error_data && error.error_data.error_code;
    const msg = error && error.error_data && error.error_data.error_msg;

    if (code === "711" || code === 711) {
      return (
        "Mini App не установлено в сообществе (ошибка VK 711).\n\n" +
        "Что сделать:\n" +
        "1. dev.vk.com → ваше приложение → включите «Разрешить установку в сообществах»\n" +
        "2. Сообщество → Управление → Приложения → Добавить → выберите это mini app\n" +
        "3. Long Poll API группы: событие app_payload должно быть включено"
      );
    }

    if (msg) {
      return String(msg);
    }

    return error && error.message ? String(error.message) : "Неизвестная ошибка";
  }

  function showDebugError(error, context, extra) {
    const hint = describeVkError(error);
    const message = formatDebugError(error, context, extra);
    debugLines.push(`ERROR ${hint}\n\n${message}`);
    console.error(message);
    setStatus(debugLines.join("\n\n"), true);
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
      debugLog("groupId from config.js", { groupId });
      return groupId;
    }

    const params = await vkBridge.send("VKWebAppGetLaunchParams");
    debugLog("VKWebAppGetLaunchParams", params);

    groupId = Number(params.vk_group_id || params.group_id || 0);
    if (groupId) {
      debugLog("groupId from launch params", { groupId });
      return groupId;
    }

    groupId = parseGroupIdFromHashValue(params.hash);
    if (groupId) {
      debugLog("groupId from params.hash", { groupId, hash: params.hash });
      return groupId;
    }

    const search = new URLSearchParams(window.location.search);
    groupId = parseGroupIdFromHashValue(search.get("hash"));
    if (groupId) {
      debugLog("groupId from URL hash param", { groupId, hash: search.get("hash") });
      return groupId;
    }

    groupId = Number(search.get("group_id") || search.get("vk_group_id") || 0);
    if (groupId) {
      debugLog("groupId from URL query", { groupId });
      return groupId;
    }

    groupId = parseGroupIdFromHashValue(window.location.hash.replace(/^#/, ""));
    if (groupId) {
      debugLog("groupId from location.hash", { groupId, hash: window.location.hash });
      return groupId;
    }

    throw new Error(
      "Не удалось определить сообщество. Укажите groupId в config.js (как VK_GROUP_ID в .env бота)."
    );
  }

  async function verifyPhone() {
    buttonEl.disabled = true;
    debugLog("verifyPhone started");

    try {
      const groupId = cachedGroupId || (await getGroupId());
      debugLog("using groupId", { groupId });

      debugLog("calling VKWebAppGetPhoneNumber");
      const phoneData = await vkBridge.send("VKWebAppGetPhoneNumber");
      debugLog("VKWebAppGetPhoneNumber response", phoneData);

      const phone = String(phoneData.phone_number || "").trim();
      const sign = String(phoneData.sign || "").trim();

      if (!phone || !sign) {
        throw new Error("VK не вернул номер телефона.", {
          cause: { phonePresent: Boolean(phone), signPresent: Boolean(sign), phoneData },
        });
      }

      const payload = {
        action: "phone_verified",
        phone: phone,
        sign: sign,
      };

      debugLog("calling VKWebAppSendPayload", {
        group_id: groupId,
        payload,
      });

      await vkBridge.send("VKWebAppSendPayload", {
        group_id: groupId,
        payload: payload,
      });

      debugLog("VKWebAppSendPayload ok");
      setStatus("Готово. Вернитесь в чат с ботом.");
      await vkBridge.send("VKWebAppClose", { status: "success" });
    } catch (error) {
      showDebugError(error, "verifyPhone", {
        cachedGroupId,
        location: {
          href: window.location.href,
          search: window.location.search,
          hash: window.location.hash,
        },
        config: window.APP_CONFIG || null,
      });
      buttonEl.disabled = false;
    }
  }

  async function init() {
    debugLog("init started", {
      href: window.location.href,
      config: window.APP_CONFIG || null,
    });

    try {
      debugLog("calling VKWebAppInit");
      await vkBridge.send("VKWebAppInit");
      debugLog("VKWebAppInit ok");

      cachedGroupId = await getGroupId();
      debugLog("init complete", { cachedGroupId });
      buttonEl.addEventListener("click", verifyPhone);
    } catch (error) {
      showDebugError(error, "init", {
        href: window.location.href,
        config: window.APP_CONFIG || null,
      });
      buttonEl.disabled = true;
    }
  }

  init();
})();
