const OPINION_ENDPOINT = "https://hgtmwthwjudzinrokmvj.supabase.co/functions/v1/submit-signature";

const opinionForm = document.querySelector("#opinion-form");
const opinionResidence = document.querySelector("#opinion-residence");
const opinionContent = document.querySelector("#opinion-content");
const opinionWebsite = document.querySelector("#opinion-website");
const opinionCounter = document.querySelector("#opinion-counter");
const opinionSubmit = document.querySelector("#opinion-submit");
const opinionMessage = document.querySelector("#opinion-message");
const opinionList = document.querySelector("#opinion-list");
const opinionCount = document.querySelector("#opinion-count");
const opinionLoading = document.querySelector("#opinion-list-loading");
const opinionEmpty = document.querySelector("#opinion-list-empty");
const opinionError = document.querySelector("#opinion-list-error");
const opinionRefresh = document.querySelector("#opinion-refresh");
const opinionRetry = document.querySelector("#opinion-retry");

function setOpinionButtonLoading(loading) {
  opinionSubmit.disabled = loading;
  opinionSubmit.setAttribute("aria-busy", String(loading));
  opinionSubmit.textContent = loading ? "正在提交…" : "提交意见";
}

function setOpinionMessage(message, isError = false) {
  opinionMessage.textContent = message;
  opinionMessage.classList.toggle("is-error", isError);
}

function setOpinionFieldError(input, message) {
  const error = document.querySelector(`[data-opinion-error-for="${input.id}"]`);
  if (error) error.textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

function validateOpinionField(input) {
  const value = input.value.trim();
  if (input === opinionResidence) {
    return setOpinionFieldError(input, value ? "" : "请填写房号。");
  }
  if (input === opinionContent) {
    return setOpinionFieldError(input, value.length >= 2 ? "" : "请至少填写两个字的意见。");
  }
  return true;
}

function formatOpinionDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function createOpinionItem(opinion) {
  const item = document.createElement("li");
  item.className = "opinion-item";

  const meta = document.createElement("div");
  meta.className = "opinion-meta";

  const residence = document.createElement("strong");
  residence.textContent = opinion.residence || "业主";

  const time = document.createElement("time");
  time.dateTime = opinion.createdAt || "";
  time.textContent = formatOpinionDate(opinion.createdAt);

  const content = document.createElement("p");
  content.textContent = opinion.content || "";

  meta.append(residence, time);
  item.append(meta, content);
  return item;
}

async function requestOpinions(payload) {
  const response = await fetch(OPINION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "request_failed");
  return result;
}

async function loadOpinions() {
  opinionLoading.hidden = false;
  opinionEmpty.hidden = true;
  opinionError.hidden = true;
  opinionRefresh.disabled = true;
  opinionRefresh.setAttribute("aria-busy", "true");

  try {
    const result = await requestOpinions({ action: "listOpinions" });
    const opinions = Array.isArray(result.opinions) ? result.opinions : [];
    opinionList.replaceChildren(...opinions.map(createOpinionItem));
    opinionCount.textContent = opinions.length ? `共 ${opinions.length} 条公开意见` : "等待第一条意见";
    opinionEmpty.hidden = opinions.length > 0;
  } catch {
    opinionList.replaceChildren();
    opinionCount.textContent = "暂时无法读取";
    opinionError.hidden = false;
  } finally {
    opinionLoading.hidden = true;
    opinionRefresh.disabled = false;
    opinionRefresh.setAttribute("aria-busy", "false");
  }
}

opinionContent.addEventListener("input", () => {
  opinionCounter.textContent = `${opinionContent.value.length} / 500`;
});

[opinionResidence, opinionContent].forEach((input) => {
  input.addEventListener("blur", () => validateOpinionField(input));
});

opinionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fieldsValid = [opinionResidence, opinionContent].map(validateOpinionField).every(Boolean);
  if (!fieldsValid) {
    opinionForm.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  if (opinionWebsite.value) {
    opinionForm.reset();
    opinionCounter.textContent = "0 / 500";
    setOpinionMessage("意见已提交，感谢你的补充。");
    return;
  }

  setOpinionMessage("");
  setOpinionButtonLoading(true);

  try {
    const result = await requestOpinions({
      action: "submitOpinion",
      residence: opinionResidence.value.trim(),
      content: opinionContent.value.trim(),
      website: "",
    });

    opinionContent.value = "";
    opinionCounter.textContent = "0 / 500";
    setOpinionFieldError(opinionContent, "");
    setOpinionMessage("意见已提交，并已更新到公开列表。");

    if (result.opinion) {
      opinionList.prepend(createOpinionItem(result.opinion));
      opinionEmpty.hidden = true;
      const currentCount = opinionList.children.length;
      opinionCount.textContent = `共 ${currentCount} 条公开意见`;
    } else {
      await loadOpinions();
    }
  } catch {
    setOpinionMessage("意见尚未保存，请检查网络后重试。你的填写内容仍保留在本页。", true);
  } finally {
    setOpinionButtonLoading(false);
  }
});

opinionRefresh.addEventListener("click", loadOpinions);
opinionRetry.addEventListener("click", loadOpinions);

loadOpinions();
