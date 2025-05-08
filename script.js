// Variables and references
let model;
let uploadedImage = null;
const imagePreview = document.getElementById('imagePreview');
const generateBtn = document.getElementById('generateBtn');
const uploadArea = document.getElementById('uploadArea');
const imageUpload = document.getElementById('imageUpload');
const stickerCanvas = document.getElementById('stickerCanvas');
const outlineColorPicker = document.getElementById('outlineColor');
const outlineSection = document.querySelector('.outline-section');
const downloadBtn = document.getElementById('downloadBtn');

let currentObjectCanvas = null; // store processed object for outline
let currentObjectImage = null; // store image for outline processing

// Load BodyPix model
async function loadBodyPix() {
  model = await bodyPix.load({ architecture: 'MobileNetV1', outputStride: 16, multiplier: 0.75 });
}
loadBodyPix();

// File upload and drag/drop handlers
uploadArea.addEventListener('click', () => { imageUpload.click(); });
uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.style.background = '#fff4';
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.background = 'transparent';
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.style.background = 'transparent';
  if (e.dataTransfer.files.length > 0) {
    loadImage(e.dataTransfer.files[0]);
  }
});

// Load image
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
    document.getElementById('stickerContainer').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// Generate sticker
document.getElementById('generateBtn').addEventListener('click', async () => {
  if (!uploadedImage || !model) {
    alert('Please upload an image and wait for the model to load.');
    return;
  }
  generateBtn.disabled = true;
  generateBtn.innerText = 'Processing...';

  // 1. Remove background
  const maskCanvas = await createMaskCanvas(uploadedImage);
  const bgRemovedCanvas = await applyMaskToImage(uploadedImage, maskCanvas);

  // 2. Generate outline of object
  currentObjectCanvas = await generateObjectOutline(bgRemovedCanvas);
  currentObjectImage = new Image();
  currentObjectImage.src = currentObjectCanvas.toDataURL();

  // 3. Apply Ghibli style filter
  const ghibliCanvas = await ghibliifyCanvas(currentObjectCanvas);

  // 4. Add outline of object
  const finalCanvas = addOutline(ghibliCanvas, outlineColorPicker.value);

  // Draw final on main canvas
  drawToMainCanvas(finalCanvas);

  // Show outline control
  outlineSection.style.display = 'flex';

  // Reset button
  generateBtn.innerText = 'Generate Sticker';
  generateBtn.disabled = false;
});

// Create mask for object detection
async function createMaskCanvas(image) {
  const segmentation = await model.segmentPerson(image, {
    flipHorizontal: false,
    internalResolution: 'medium',
    segmentationThreshold: 0.7
  });
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = image.naturalWidth;
  maskCanvas.height = image.naturalHeight;
  const ctx = maskCanvas.getContext('2d');

  // Create mask image data
  const imageData = ctx.createImageData(maskCanvas.width, maskCanvas.height);
  for (let i = 0; i < segmentation.data.length; i++) {
    const offset = i * 4;
    if (segmentation.data[i] === 1) {
      imageData.data[offset + 3] = 255; // opaque
    } else {
      imageData.data[offset + 3] = 0; // transparent
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return maskCanvas;
}

// Apply mask to remove background
async function applyMaskToImage(image, maskCanvas) {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const maskData = maskCanvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < imgData.data.length; i += 4) {
    if (maskData.data[i + 3] === 0) {
      imgData.data[i + 3] = 0; // transparent
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// Generate outline of object
async function generateObjectOutline(canvas) {
  const ctx = canvas.getContext('2d');

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Convert to grayscale
  const grayData = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    grayData[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Simple edge detection (Sobel)
  const edgeData = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = y * canvas.width + x;
      const gx =
        -grayData[idx - canvas.width - 1] - 2 * grayData[idx - 1] - grayData[idx + canvas.width - 1]
        + grayData[idx - canvas.width + 1] + 2 * grayData[idx + 1] + grayData[idx + canvas.width + 1];
      const gy =
        -grayData[idx - canvas.width - 1] - 2 * grayData[idx - canvas.width] - grayData[idx - canvas.width + 1]
        + grayData[idx + canvas.width - 1] + 2 * grayData[idx + canvas.width] + grayData[idx + canvas.width + 1];
      const g = Math.sqrt(gx * gx + gy * gy);
      edgeData[idx] = g > 20 ? 255 : 0; // threshold
    }
  }

  // Create outline image
  const outlineCanvas = document.createElement('canvas');
  outlineCanvas.width = canvas.width;
  outlineCanvas.height = canvas.height;
  const outlineCtx = outlineCanvas.getContext('2d');

  const outlineImageData = outlineCtx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < edgeData.length; i++) {
    const v = edgeData[i];
    outlineImageData.data[i * 4] = 0; // R
    outlineImageData.data[i * 4 + 1] = 0; // G
    outlineImageData.data[i * 4 + 2] = 0; // B
    outlineImageData.data[i * 4 + 3] = v; // alpha
  }
  outlineCtx.putImageData(outlineImageData, 0, 0);
  return outlineCanvas;
}

// Apply Ghibli-like style
async function ghibliifyCanvas(canvas) {
  const ctx = canvas.getContext('2d');

  // Posterize effect
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const levels = 4;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(data[i] / (256 / levels)) * (256 / levels);
    data[i + 1] = Math.floor(data[i + 1] / (256 / levels)) * (256 / levels);
    data[i + 2] = Math.floor(data[i + 2] / (256 / levels)) * (256 / levels);
  }
  ctx.putImageData(imageData, 0, 0);

  // Slight blur for smoothness
  ctx.filter = 'blur(0.5px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  // Optional: you can add more filters here for style
  return canvas;
}

// Add outline around object
function addOutline(canvas, color) {
  const outlineSize = 12; // thicker outline
  const width = canvas.width + outlineSize * 2;
  const height = canvas.height + outlineSize * 2;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');

  ctx.clearRect(0, 0, width, height);

  // Draw outline with shadow
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = outlineSize;
  ctx.drawImage(canvas, outlineSize, outlineSize);
  ctx.restore();

  // Draw the object again
  ctx.drawImage(canvas, outlineSize, outlineSize);

  // Draw border for solid outline
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

// Draw final image on main canvas
function drawToMainCanvas(canvas) {
  // set size
  stickerCanvas.width = canvas.width;
  stickerCanvas.height = canvas.height;
  const ctx = stickerCanvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas, 0, 0);
  document.getElementById('stickerContainer').style.display = 'block';
}

// Dynamic outline color update
outlineColorPicker.addEventListener('input', () => {
  if (stickerCanvas.width && stickerCanvas.height && currentObjectCanvas) {
    const outlined = addOutline(ghibliifyCanvas(currentObjectCanvas), outlineColorPicker.value);
    drawToMainCanvas(outlined);
  }
});

// Download
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.href = stickerCanvas.toDataURL('image/png');
  link.download = 'ghibli_sticker.png';
  link.click();
});
