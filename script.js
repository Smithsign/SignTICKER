let model;
let uploadedImg;
let selectedCanvas;

async function loadModel() {
  model = await cocoSsd.load();
  console.log("Model loaded.");
}

loadModel();

// Handle file input change (for clicking to upload)
document.getElementById("upload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      uploadedImg = img;
      document.getElementById("canvas-area").innerHTML = "";
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      document.getElementById("canvas-area").appendChild(canvas);
      generateStickers();
    };
  };
  reader.readAsDataURL(file);
});

// Handle drag-and-drop events
const uploadArea = document.getElementById('upload-area');

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = "#ffb84d";
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.backgroundColor = "#fff7e6";
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.backgroundColor = "#fff7e6";
  const file = e.dataTransfer.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = () => {
      uploadedImg = img;
      document.getElementById("canvas-area").innerHTML = "";
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      document.getElementById("canvas-area").appendChild(canvas);
      generateStickers();
    };
  };
  reader.readAsDataURL(file);
});

async function generateStickers() {
  const canvas = document.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  const predictions = await model.detect(canvas);
  const mainObject = predictions[0]; // Pick the most confident one
  if (!mainObject) return alert("No subject detected.");

  const {bbox} = mainObject;
  const [x, y, width, height] = bbox;

  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const stickerCanvas = document.createElement("canvas");
    stickerCanvas.width = 300;
    stickerCanvas.height = 300;
    const sctx = stickerCanvas.getContext("2d");

    // Apply some transformations like rotation for varied facial expressions
    sctx.translate(150, 150);
    const angle = (i - 2) * 0.1;
    sctx.rotate(angle);
    sctx.translate(-150, -150);

    sctx.drawImage(canvas, x, y, width, height, 50 + i * 5, 50 + i * 3, 200, 200);
    sctx.setTransform(1, 0, 0, 1, 0, 0);

    stickerCanvas.onclick = () => {
      document.querySelectorAll("canvas").forEach(c => c.style.border = "2px solid #ff7a00");
      stickerCanvas.style.border = "4px solid #00c853";
      selectedCanvas = stickerCanvas;
    };

    gallery.appendChild(stickerCanvas);
  }

  document.getElementById("actions").style.display = "block";
}

function downloadSticker() {
  if (!selectedCanvas) return alert("Select a sticker first.");
  const format = prompt("Download format: JPEG or PNG?").toLowerCase();
  const link = document.createElement("a");
  link.download = `sticker.${format === "jpeg" ? "jpg" : "png"}`;
  link.href = selectedCanvas.toDataURL(`image/${format === "jpeg" ? "jpeg" : "png"}`);
  link.click();
}

function shareSticker() {
  if (!selectedCanvas) return alert("Select a sticker first.");
  selectedCanvas.toBlob(blob => {
    const file = new File([blob], "sticker.png", {type: "image/png"});
    const url = `https://twitter.com/intent/tweet?text=Check%20out%20my%20sticker!%20%23StickerMaker`;
    window.open(url, "_blank");
  });
}
