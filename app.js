(function () {
  const statusEl = document.getElementById("status");
  const buttonEl = document.getElementById("verify-btn");

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.className = isError ? "status error" : "status";
  }

  async function getGroupId() {
    const params = await vkBridge.send("VKWebAppGetLaunchParams");
    const groupId = Number(params.vk_group_id || params.group_id || 0);
    if (!groupId) {
      throw new Error("Не удалось определить сообщество. Откройте приложение из чата бота.");
    }
    return groupId;
  }

  async function verifyPhone() {
    buttonEl.disabled = true;
    setStatus("Запрашиваем доступ к номеру...");

    try {
      const phoneData = await vkBridge.send("VKWebAppGetPhoneNumber");
      const phone = String(phoneData.phone_number || "").trim();
      const sign = String(phoneData.sign || "").trim();

      if (!phone || !sign) {
        throw new Error("VK не вернул номер телефона.");
      }

      const groupId = await getGroupId();
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
      buttonEl.addEventListener("click", verifyPhone);
    } catch (error) {
      setStatus("Не удалось инициализировать приложение.", true);
    }
  }

  init();
})();
