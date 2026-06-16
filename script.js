const avatarInput = document.querySelector("#avatarInput");
const avatarButton = document.querySelector("#avatarButton");
const avatarPreview = document.querySelector("#avatarPreview");
const editAvatarBtn = document.querySelector("#editAvatarBtn");
const exportPdfBtn = document.querySelector("#exportPdfBtn");
const printBtn = document.querySelector("#printBtn");
const statusText = document.querySelector("#statusText");
const resumeDocument = document.querySelector("#resumeDocument");
const sidebarToggle = document.querySelector("#sidebarToggle");
const sidebarContent = document.querySelector("#sidebarContent");

const cropperModal = document.querySelector("#cropperModal");
const closeCropperBtn = document.querySelector("#closeCropperBtn");
const cropCanvas = document.querySelector("#cropCanvas");
const zoomRange = document.querySelector("#zoomRange");
const rotateLeftBtn = document.querySelector("#rotateLeftBtn");
const rotateRightBtn = document.querySelector("#rotateRightBtn");
const resetCropBtn = document.querySelector("#resetCropBtn");
const applyCropBtn = document.querySelector("#applyCropBtn");
const cropCtx = cropCanvas.getContext("2d");

const cropState = {
  image: null,
  sourceUrl: "",
  x: 0,
  y: 0,
  zoom: 1,
  rotation: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
};

const SIDEBAR_STORAGE_KEY = "resumeEditorSidebarCollapsed";

function readSidebarPreference() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function saveSidebarPreference(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
  } catch (error) {
    // Storage can be unavailable in stricter browser modes.
  }
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", collapsed ? "展开操作栏" : "收起操作栏");
  sidebarToggle.title = collapsed ? "展开操作栏" : "收起操作栏";
  sidebarContent.setAttribute("aria-hidden", String(collapsed));
  sidebarContent.inert = collapsed;
  sidebarContent.toggleAttribute("inert", collapsed);
}

function toggleSidebar() {
  const collapsed = !document.body.classList.contains("sidebar-collapsed");
  setSidebarCollapsed(collapsed);
  saveSidebarPreference(collapsed);
}

function getPdfExporter() {
  if (typeof window.html2pdf === "function") return window.html2pdf;
  if (typeof globalThis.html2pdf === "function") return globalThis.html2pdf;
  if (typeof html2pdf === "function") return html2pdf;
  return null;
}

function updatePdfLibraryState() {
  document.documentElement.dataset.pdfLibrary = getPdfExporter() ? "ready" : "missing";
}

function setStatus(message) {
  statusText.textContent = message;
}

function openFilePicker() {
  avatarInput.click();
}

function resetCropTransform() {
  cropState.x = 0;
  cropState.y = 0;
  cropState.zoom = 1;
  cropState.rotation = 0;
  zoomRange.value = "1";
}

function loadImageFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    setStatus("请选择图片文件");
    return;
  }

  if (cropState.sourceUrl) {
    URL.revokeObjectURL(cropState.sourceUrl);
  }

  const image = new Image();
  const url = URL.createObjectURL(file);

  image.onload = () => {
    cropState.image = image;
    cropState.sourceUrl = url;
    resetCropTransform();
    editAvatarBtn.disabled = false;
    openCropper();
    setStatus("头像已载入");
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    setStatus("图片读取失败");
  };

  image.src = url;
}

function getCoverScale(targetSize) {
  const { image } = cropState;
  if (!image) return 1;
  return Math.max(targetSize / image.naturalWidth, targetSize / image.naturalHeight);
}

function drawCroppedImage(ctx, size) {
  const { image, x, y, zoom, rotation } = cropState;
  if (!image) return;

  const baseScale = getCoverScale(size);
  const scale = baseScale * zoom;
  const center = size / 2;

  ctx.save();
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#eef2f7";
  ctx.fillRect(0, 0, size, size);
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  ctx.translate(center + x * (size / cropCanvas.width), center + y * (size / cropCanvas.height));
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.restore();
}

function drawCropper() {
  const size = cropCanvas.width;
  cropCtx.clearRect(0, 0, size, size);

  if (!cropState.image) {
    cropCtx.fillStyle = "#eef2f7";
    cropCtx.fillRect(0, 0, size, size);
    return;
  }

  drawCroppedImage(cropCtx, size);

  cropCtx.save();
  cropCtx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  cropCtx.lineWidth = 1;
  for (let i = 1; i < 3; i += 1) {
    const p = (size / 3) * i;
    cropCtx.beginPath();
    cropCtx.moveTo(p, 0);
    cropCtx.lineTo(p, size);
    cropCtx.moveTo(0, p);
    cropCtx.lineTo(size, p);
    cropCtx.stroke();
  }
  cropCtx.strokeStyle = "#2e6fd0";
  cropCtx.lineWidth = 5;
  cropCtx.strokeRect(2.5, 2.5, size - 5, size - 5);
  cropCtx.restore();
}

function openCropper() {
  if (!cropState.image) {
    openFilePicker();
    return;
  }

  cropperModal.hidden = false;
  drawCropper();
  closeCropperBtn.focus();
}

function closeCropper() {
  cropperModal.hidden = true;
  avatarButton.focus();
}

function applyCrop() {
  if (!cropState.image) return;

  const output = document.createElement("canvas");
  const outputSize = 720;
  output.width = outputSize;
  output.height = outputSize;
  const outputCtx = output.getContext("2d");
  drawCroppedImage(outputCtx, outputSize);

  avatarPreview.src = output.toDataURL("image/jpeg", 0.95);
  avatarButton.classList.add("has-image");
  closeCropper();
  setStatus("头像已应用");
}

function getCanvasPoint(event) {
  const rect = cropCanvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * cropCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * cropCanvas.height,
  };
}

avatarInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadImageFile(file);
  avatarInput.value = "";
});

avatarButton.addEventListener("click", () => {
  if (cropState.image) {
    openCropper();
  } else {
    openFilePicker();
  }
});

editAvatarBtn.addEventListener("click", openCropper);
closeCropperBtn.addEventListener("click", closeCropper);
sidebarToggle.addEventListener("click", toggleSidebar);

cropperModal.addEventListener("click", (event) => {
  if (event.target === cropperModal) closeCropper();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cropperModal.hidden) closeCropper();
});

zoomRange.addEventListener("input", () => {
  cropState.zoom = Number(zoomRange.value);
  drawCropper();
});

rotateLeftBtn.addEventListener("click", () => {
  cropState.rotation -= 90;
  drawCropper();
});

rotateRightBtn.addEventListener("click", () => {
  cropState.rotation += 90;
  drawCropper();
});

resetCropBtn.addEventListener("click", () => {
  resetCropTransform();
  drawCropper();
});

applyCropBtn.addEventListener("click", applyCrop);

cropCanvas.addEventListener("pointerdown", (event) => {
  if (!cropState.image) return;
  cropCanvas.setPointerCapture(event.pointerId);
  const point = getCanvasPoint(event);
  cropState.isDragging = true;
  cropState.lastX = point.x;
  cropState.lastY = point.y;
});

cropCanvas.addEventListener("pointermove", (event) => {
  if (!cropState.isDragging) return;
  const point = getCanvasPoint(event);
  cropState.x += point.x - cropState.lastX;
  cropState.y += point.y - cropState.lastY;
  cropState.lastX = point.x;
  cropState.lastY = point.y;
  drawCropper();
});

cropCanvas.addEventListener("pointerup", (event) => {
  cropState.isDragging = false;
  cropCanvas.releasePointerCapture(event.pointerId);
});

cropCanvas.addEventListener("pointercancel", () => {
  cropState.isDragging = false;
});

cropCanvas.addEventListener(
  "wheel",
  (event) => {
    if (!cropState.image) return;
    event.preventDefault();
    const nextZoom = Math.min(3, Math.max(0.6, cropState.zoom + (event.deltaY > 0 ? -0.06 : 0.06)));
    cropState.zoom = nextZoom;
    zoomRange.value = String(nextZoom);
    drawCropper();
  },
  { passive: false }
);

function prepareForExport() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}

async function exportPdf() {
  prepareForExport();
  setStatus("正在生成 PDF...");
  document.body.classList.add("is-exporting");

  const options = {
    margin: 0,
    filename: "小周-科研型三页简历.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
      compress: true,
    },
  };

  try {
    const pdfExporter = getPdfExporter();
    if (!pdfExporter) {
      throw new Error("html2pdf unavailable");
    }
    await pdfExporter().set(options).from(resumeDocument).save();
    setStatus("PDF 已导出");
  } catch (error) {
    setStatus("已打开打印窗口，可选择另存为 PDF");
    window.print();
  } finally {
    document.body.classList.remove("is-exporting");
  }
}

exportPdfBtn.addEventListener("click", exportPdf);

printBtn.addEventListener("click", () => {
  prepareForExport();
  setStatus("已打开打印窗口");
  window.print();
});

setSidebarCollapsed(readSidebarPreference());
updatePdfLibraryState();
window.addEventListener("load", updatePdfLibraryState);
