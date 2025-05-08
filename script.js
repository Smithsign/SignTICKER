// Variables to hold model and DOM elements
let styleTransferModel = null;
const originalImage = document.getElementById('originalImage');
const uploadArea = document.getElementById('uploadArea');
const imageUpload = document.getElementById('imageUpload');
const applyStyleBtn = document.getElementById('applyStyleBtn');
const resultCanvas = document.getElementById('resultCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const resultSection = document.querySelector('.result-section');

// Load style transfer model on startup
async function loadModel() {
  styleTransferModel = await tf.loadGraphModel(
    'https://storage.googleapis.com/tfjs-models/savedmodel/style-transfer/model.json'
  );
}
loadModel();

// Handle image upload via click or drag/drop
uploadArea.addEventListener('click', () => { imageUpload.click(); });
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

// Load selected image
function loadImage(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    originalImage.src = reader.result;
    originalImage.onload = () => {
      originalImage.style.display = 'block';
      applyStyleBtn.disabled = false;
      document.querySelector('.result-section').style.display = 'none';
    };
  };
  reader.readAsDataURL(file);
}

// Apply style transfer on button click
applyStyleBtn.addEventListener('click', async () => {
  if (!originalImage.src || !styleTransferModel) return;

  applyStyleBtn.disabled = true;
  applyStyleBtn.innerText = 'Processing...';

  // Prepare image tensor
  const imgTensor = tf.browser.fromPixels(originalImage).toFloat().div(255).expandDims();

  // Run style transfer model
  const stylizedTensor = await styleTransferModel.executeAsync(imgTensor);

  // Convert tensor to image data
  const stylizedImageData = await tf.browser.toPixels(stylizedTensor.squeeze());

  // Draw onto canvas
  const ctx = resultCanvas.getContext('2d');
  resultCanvas.width = originalImage.width;
  resultCanvas.height = originalImage.height;
  const imageData = ctx.createImageData(resultCanvas.width, resultCanvas.height);
  imageData.data.set(stylizedImageData);
  ctx.putImageData(imageData, 0, 0);

  // Show result section
  document.querySelector('.result-section').style.display = 'block';

  // Cleanup tensors
  tf.dispose([imgTensor, stylizedTensor]);

  // Reset button
  applyStyleBtn.innerText = 'Apply Ghibli Style';
  applyStyleBtn.disabled = false;
});

// Download the stylized image
downloadBtn.onclick = () => {
  const link = document.createElement('a');
  link.href = resultCanvas.toDataURL('image/png');
  link.download = 'ghibli_style_sticker.png';
  link.click();
};
