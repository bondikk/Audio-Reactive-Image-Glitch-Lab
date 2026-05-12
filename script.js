const imageInput = document.getElementById("imageInput");
const audioInput = document.getElementById("audioInput");

const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const downloadButton = document.getElementById("downloadButton");

const originalCanvas = document.getElementById("originalCanvas");
const glitchCanvas = document.getElementById("glitchCanvas");
const spectrumCanvas = document.getElementById("spectrumCanvas");

const originalCtx = originalCanvas.getContext("2d");
const glitchCtx = glitchCanvas.getContext("2d");
const spectrumCtx = spectrumCanvas.getContext("2d");

const audioPlayer = document.getElementById("audioPlayer");

let loadedImage = null;
let imageLoaded = false;

function resizeCanvasToImage(canvas, image) {
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / image.width);

  canvas.width = image.width * scale;
  canvas.height = image.height * scale;
}

function drawImageToCanvases(image) {
  resizeCanvasToImage(originalCanvas, image);
  resizeCanvasToImage(glitchCanvas, image);

  originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
  glitchCtx.clearRect(0, 0, glitchCanvas.width, glitchCanvas.height);

  originalCtx.drawImage(image, 0, 0, originalCanvas.width, originalCanvas.height);
  glitchCtx.drawImage(image, 0, 0, glitchCanvas.width, glitchCanvas.height);
}

function loadImage(file) {
  const reader = new FileReader();

  reader.onload = function (event) {
    const image = new Image();

    image.onload = function () {
      loadedImage = image;
      imageLoaded = true;
      drawImageToCanvases(image);
    };

    image.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];

  if (!file) {
    return;
  }

  loadImage(file);
});