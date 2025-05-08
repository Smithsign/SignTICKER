// Select DOM elements
const uploadArea = document.getElementById('uploadArea');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const generateBtn = document.getElementById('generateBtn');
const stickerContainer = document.getElementById('stickerContainer');
const stickerImage = document.getElementById('stickerImage');
const outlineColorPicker = document.getElementById('outlineColor');
const outlineSection = document.querySelector('.outline-section');
const downloadBtn = document.getElementById('downloadBtn');

let uploadedImage = null;

// Helper function to trigger file input
uploadArea.addEventListener('click', () => {
  imageUpload.click();
});

// Drag and Drop
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.style.background = '#fff4';
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.background = 'transparent';
});
uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.style.background = 'transparent';
  if (e.dataTransfer.files.length > 0) {
    loadImage(e.dataTransfer.files[0]);
  }
});

// File input change
imageUpload.addEventListener('change', () => {
  if (imageUpload.files.length > 0) {
    loadImage(imageUpload.files[0]);
  }
});

// Load image and show preview
function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.src = reader.result;
    imagePreview.style.display = 'block';
    uploadedImage = new Image();
    uploadedImage.src = reader.result;
    // Enable generate button
    generateBtn.disabled = false;
    // Reset previous sticker
    document.getElementById('stickerContainer').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// Generate sticker button click
document.getElementById('generateBtn').addEventListener('click', () => {
  if (!uploadedImage) {
    alert('Please upload an image first.');
    return;
  }
  processImage();
});

// Main processing function
async function processImage() {
  generateBtn.disabled = true;
  generateBtn.textContent = 'Processing...';

  // Step 1: Remove background (simulate here)
  const bgRemovedCanvas = await removeBackground(imagePreview);

  // Step 2: Cartoonize
  const cartoonCanvas = await cartoonizeImage(bgRemovedCanvas);

  // Step 3: Add outline
  const outlinedCanvas = addOutline(cartoonCanvas, outlineColorPicker.value);

  const dataURL = outlinedCanvas.toDataURL('image/png');

  // Show preview
  stickerImage.src = dataURL;
  document.getElementById('stickerContainer').style.display = 'block';

  // Set download
  downloadBtn.onclick = () => {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'sticker.png';
    link.click();
  };

  // Show outline control
  outlineSection.style.display = 'flex';

  // Reset button
  generateBtn.disabled = false;
  generateBtn.innerText = 'Generate Sticker';
}

// Placeholder background removal
async function removeBackground(image) {
  // For production, use remove.bg API or similar
  // Here, just copy the image as-is
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  await new Promise((resolve) => {
    if (image.complete) {
      resolve();
    } else {
      image.onload = () => resolve();
    }
  });
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  ctx.drawImage(image, 0, 0);
  return canvas;
}

// Cartoonize: simple posterize effect
async function cartoonizeImage(sourceCanvas) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const levels = 4;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] / (256 / levels)) * (256 / levels); // R
    data[i + 1] = Math.floor(data[i + 1] / (256 / levels)) * (256 / levels); // G
    data[i + 2] = Math.floor(data[i + 2] / (256 / levels)) * (256 / levels); // B
  }
  ctx.putImageData(imageData, 0, 0);

  // Optional: add edge detection for better effect
  return canvas;
}

// Add outline with color
function addOutline(canvas, color) {
  const outlineSize = 8;
  const width = canvas.width + outlineSize * 2;
  const height = canvas.height + outlineSize * 2;

  const outCanvas = document.createElement('canvas');
  const ctx = outCanvas.getContext('2d');
  outCanvas.width = width;
  outCanvas.height = height;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = outlineSize;
  ctx.drawImage(canvas, outlineSize, outlineSize);
  ctx.restore();

  // Draw border rectangle for outline
  ctx.strokeStyle = color;
  ctx.lineWidth = outlineSize;
  ctx.strokeRect(
    outlineSize / 2,
    outlineSize / 2,
    canvas.width + outlineSize,
    canvas.height + outlineSize
  );

  return outCanvas;
}

// Change outline color dynamically
document.getElementById('outlineColor').addEventListener('input', () => {
  if (stickerImage.src) {
    const img = new Image();
    img.src = stickerImage.src;
    img.onload = () => {
      const outlinedCanvas = addOutline(
        (function () {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          return c;
        })(),
        document.getElementById('outlineColor').value
      );
      stickerImage.src = outlinedCanvas.toDataURL('image/png');
    };
  }
});
