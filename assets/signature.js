const ENDPOINT = "https://hgtmwthwjudzinrokmvj.supabase.co/functions/v1/submit-signature";
const SESSION_KEY = "entrance-remediation-signature-code";

const accessPanel = document.querySelector("#access-panel");
const accessForm = document.querySelector("#access-form");
const accessCodeInput = document.querySelector("#access-code");
const accessCodeError = document.querySelector("#access-code-error");
const accessSubmit = document.querySelector("#access-submit");
const accessMessage = document.querySelector("#access-message");
const signatureCard = document.querySelector("#signature-card");
const signatureForm = document.querySelector("#signature-form");
const signatureSubmit = document.querySelector("#signature-submit");
const signatureMessage = document.querySelector("#signature-message");
const successCard = document.querySelector("#success-card");
const receiptCode = document.querySelector("#receipt-code");
const submitAnother = document.querySelector("#submit-another");
const canvas = document.querySelector("#signature-canvas");
const canvasWrap = document.querySelector("#signature-canvas-wrap");
const canvasPlaceholder = document.querySelector("#canvas-placeholder");
const signatureError = document.querySelector("#signature-error");
const clearSignature = document.querySelector("#clear-signature");

const context = canvas.getContext("2d", { alpha: false });
let drawing = false;
let hasInk = false;
let lastPoint = null;

function setButtonLoading(button, loading, loadingText, normalText) {
  button.disabled = loading;
  button.setAttribute("aria-busy", String(loading));
  button.textContent = loading ? loadingText : normalText;
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
}

function setupCanvas(savedImage = null) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvasWrap.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.fillStyle = "#fbfaf7";
  context.fillRect(0, 0, rect.width, rect.height);
  context.strokeStyle = "#16251f";
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (savedImage) {
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = savedImage;
  }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

canvas.addEventListener("pointerdown", (event) => {
  drawing = true;
  lastPoint = pointFromEvent(event);
  canvas.setPointerCapture(event.pointerId);
  signatureError.textContent = "";
});

canvas.addEventListener("pointermove", (event) => {
  if (!drawing || !lastPoint) return;
  const point = pointFromEvent(event);
  context.beginPath();
  context.moveTo(lastPoint.x, lastPoint.y);
  context.lineTo(point.x, point.y);
  context.stroke();
  lastPoint = point;
  hasInk = true;
  canvasPlaceholder.hidden = true;
});

function stopDrawing() {
  drawing = false;
  lastPoint = null;
}

canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);

clearSignature.addEventListener("click", () => {
  hasInk = false;
  canvasPlaceholder.hidden = false;
  signatureError.textContent = "";
  setupCanvas();
  canvas.focus();
});

const resizeObserver = new ResizeObserver(() => {
  const savedImage = hasInk ? canvas.toDataURL("image/png") : null;
  setupCanvas(savedImage);
});
resizeObserver.observe(canvasWrap);

function showSignatureForm() {
  accessPanel.hidden = true;
  successCard.hidden = true;
  signatureCard.hidden = false;
  requestAnimationFrame(() => {
    setupCanvas();
    document.querySelector("#signer-name").focus();
  });
}

async function verifyAccessCode(code) {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Signature-Access-Code": code,
    },
    body: JSON.stringify({ action: "verify" }),
  });
  return response.ok;
}

accessForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = accessCodeInput.value.trim();
  accessCodeError.textContent = code ? "" : "请输入访问码。";
  accessCodeInput.setAttribute("aria-invalid", String(!code));
  if (!code) return;

  setMessage(accessMessage, "");
  setButtonLoading(accessSubmit, true, "正在验证…", "进入签名页");

  try {
    const valid = await verifyAccessCode(code);
    if (!valid) {
      accessCodeError.textContent = "访问码不正确，请核对后重试。";
      accessCodeInput.setAttribute("aria-invalid", "true");
      accessCodeInput.focus();
      return;
    }
    sessionStorage.setItem(SESSION_KEY, code);
    showSignatureForm();
  } catch {
    setMessage(accessMessage, "暂时无法连接签名服务，请稍后重试。", true);
  } finally {
    setButtonLoading(accessSubmit, false, "正在验证…", "进入签名页");
  }
});

function fieldError(input, message) {
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  if (error) error.textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

function validateInput(input) {
  const value = input.type === "checkbox" ? input.checked : input.value.trim();
  if (input.id === "signer-name") {
    return fieldError(input, value.length >= 2 ? "" : "请填写至少两个字的姓名。");
  }
  if (input.id === "consent") {
    return fieldError(input, value ? "" : "提交前请确认使用范围。");
  }
  return fieldError(input, "");
}

[...signatureForm.querySelectorAll("input")].forEach((input) => {
  input.addEventListener("blur", () => validateInput(input));
});

signatureForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const signerName = document.querySelector("#signer-name");
  const residence = document.querySelector("#residence");
  const contact = document.querySelector("#contact");
  const consent = document.querySelector("#consent");
  const accessCode = sessionStorage.getItem(SESSION_KEY) ?? "";

  const inputsValid = [signerName, consent].map(validateInput).every(Boolean);
  signatureError.textContent = hasInk ? "" : "请先在签名区域完成手写签名。";
  if (!inputsValid || !hasInk) {
    const firstError = signatureForm.querySelector('[aria-invalid="true"]') || canvas;
    firstError.focus();
    return;
  }

  setMessage(signatureMessage, "");
  setButtonLoading(signatureSubmit, true, "正在安全保存…", "确认并提交签名");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature-Access-Code": accessCode,
      },
      body: JSON.stringify({
        signerName: signerName.value.trim(),
        residence: residence.value.trim() || null,
        contact: contact.value.trim() || null,
        signatureDataUrl: canvas.toDataURL("image/png"),
        consent: true,
        browserLocale: navigator.language,
      }),
    });

    if (response.status === 401) {
      sessionStorage.removeItem(SESSION_KEY);
      signatureCard.hidden = true;
      accessPanel.hidden = false;
      accessCodeInput.value = "";
      setMessage(accessMessage, "访问码已失效，请重新输入。", true);
      accessCodeInput.focus();
      return;
    }

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "save_failed");

    receiptCode.textContent = result.receipt;
    signatureCard.hidden = true;
    successCard.hidden = false;
    successCard.focus();
  } catch {
    setMessage(signatureMessage, "签名尚未保存，请检查网络后重试。你的填写内容仍保留在本页。", true);
  } finally {
    setButtonLoading(signatureSubmit, false, "正在安全保存…", "确认并提交签名");
  }
});

submitAnother.addEventListener("click", () => {
  signatureForm.reset();
  hasInk = false;
  canvasPlaceholder.hidden = false;
  setupCanvas();
  successCard.hidden = true;
  signatureCard.hidden = false;
  setMessage(signatureMessage, "");
  document.querySelector("#signer-name").focus();
});

const savedCode = sessionStorage.getItem(SESSION_KEY);
if (savedCode) {
  verifyAccessCode(savedCode).then((valid) => {
    if (valid) showSignatureForm();
    else sessionStorage.removeItem(SESSION_KEY);
  }).catch(() => {
    setMessage(accessMessage, "暂时无法连接签名服务，请稍后重试。", true);
  });
}
