import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.0.0/+esm';

let uploadedImg;
let selectedCanvas;

const upload = document.getElementById("upload");
const generate = document.getElementById("generate");
const outlineColor = document.getElementById("outlineColor");

upload.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const img = new Image();
  img.src = URL.createObjectURL(file);
  await img.decode();

  uploadedImg = img;
  document.getElementById("canvas-area").innerHTML = "";
  const preview = document.createElement("canvas");
  preview.width = img.width;
  preview.height = img.height;
  const ctx = preview.getContext("2d");
  ctx.drawImage(img, 0, 0);
  document.getElementById("canvas-area").appendChild(preview);
  generate.style.display = "inline-block";
});

generate.addEventListener("click", async () => {
  if (!uploadedImg) return;

  const outlineHex = outlineColor.value;

  // Step 1: Remove background
  const processedImg = await removeBackground(uploadedImg);

  // Step 2: Cartoonize
  const cartoonCanvas = cartoonize(processedImg);

  // Step 3: Generate sticker versions
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(150, 150);
    const angle = (i - 2) * 0.1;
    ctx.rotate(angle);
    ctx.translate(-150, -150);

    ctx.drawImage(cartoonCanvas, 50 + i * 3, 50 + i * 2, 200, 200);

    // Outline
    ctx.lineWidth = 8;
    ctx.strokeStyle = outlineHex;
    ctx.strokeRect(50 + i * 3, 50 + i * 2, 200, 200);

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    canvas.onclick = () => {
      document.querySelectorAll("canvas").forEach(c => c.style.border = "2px dashed #ff7a00");
      canvas.style.border = "4px solid #00c853";
      selectedCanvas = canvas;
    };

    if (i === 0) selectedCanvas = canvas;
    gallery.appendChild(canvas);
  }

  document.getElementById("actions").style.display = "block";
});

function cartoonize(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Simple pixelate/cartoonize effect
  for (let y = 0; y < canvas.height; y += 2) {
    for (let x = 0; x < canvas.width; x += 2) {
      const i = (y * canvas.width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];

      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const ni = ((y + dy) * canvas.width + (x + dx)) * 4;
          data[ni] = r;
          data[ni+1] = g;
          data[ni+2] = b;
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

window.downloadSticker = () => {
  if (!selectedCanvas) return alert("Select a sticker first.");
  const link = document.createElement("a");
  link.download = "sticker.png";
  link.href = selectedCanvas.toDataURL("image/png");
  link.click();
};

window.shareSticker = () => {
  if (!selectedCanvas) return alert("Select a sticker first.");
  selectedCanvas.toBlob(blob => {
    const file = new File([blob], "sticker.png", { type: "image/png" });
    const url = `https://twitter.com/intent/tweet?text=Check%20out%20my%20sticker!%20%23StickerMaker`;
    window.open(url, "_blank");
  });
};
