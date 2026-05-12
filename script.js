const imageInput = document.getElementById("imageInput");
const audioInput = document.getElementById("audioInput");

const playButton = document.getElementById("playButton");
const stopButton = document.getElementById("stopButton");
const downloadButton = document.getElementById("downloadButton");

const glitchIntensitySlider = document.getElementById("glitchIntensity");
const rgbShiftSlider = document.getElementById("rgbShift");
const waveDistortionSlider = document.getElementById("waveDistortion");
const brightnessPulseSlider = document.getElementById("brightnessPulse");

const originalCanvas = document.getElementById("originalCanvas");
const glitchCanvas = document.getElementById("glitchCanvas");
const spectrumCanvas = document.getElementById("spectrumCanvas");

const originalCtx = originalCanvas.getContext("2d");
const glitchCtx = glitchCanvas.getContext("2d");
const spectrumCtx = spectrumCanvas.getContext("2d");

const audioPlayer = document.getElementById("audioPlayer");

let loadedImage = null;
let imageLoaded = false;
let audioLoaded = false;

let audioContext = null;
let analyser = null;
let sourceNode = null;
let frequencyData = null;

let animationId = null;
let imageDataCache = null;

function resizeCanvasToImage(canvas, image) {
  const maxWidth = 900;
  const scale = Math.min(1, maxWidth / image.width);

  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
}

function drawImageToCanvases(image) {
  resizeCanvasToImage(originalCanvas, image);
  resizeCanvasToImage(glitchCanvas, image);

  originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
  glitchCtx.clearRect(0, 0, glitchCanvas.width, glitchCanvas.height);

  originalCtx.drawImage(image, 0, 0, originalCanvas.width, originalCanvas.height);
  glitchCtx.drawImage(image, 0, 0, glitchCanvas.width, glitchCanvas.height);

  imageDataCache = glitchCtx.getImageData(0, 0, glitchCanvas.width, glitchCanvas.height);
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

function loadAudio(file) {
  const audioUrl = URL.createObjectURL(file);

  audioPlayer.src = audioUrl;
  audioLoaded = true;
}

function setupAudioAnalyzer() {
  if (audioContext) {
    return;
  }

  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  sourceNode = audioContext.createMediaElementSource(audioPlayer);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  frequencyData = new Uint8Array(analyser.frequencyBinCount);
}

function getAverageVolume() {
  if (!frequencyData || frequencyData.length === 0) {
    return 0;
  }

  let sum = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }

  return sum / frequencyData.length / 255;
}

function resizeSpectrumCanvas() {
  spectrumCanvas.width = spectrumCanvas.clientWidth;
  spectrumCanvas.height = 170;
}

function drawSpectrum() {
  if (!analyser || !frequencyData) {
    return;
  }

  resizeSpectrumCanvas();

  analyser.getByteFrequencyData(frequencyData);

  spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);

  const barCount = frequencyData.length;
  const barWidth = spectrumCanvas.width / barCount;

  for (let i = 0; i < barCount; i++) {
    const value = frequencyData[i];
    const barHeight = (value / 255) * spectrumCanvas.height;

    spectrumCtx.fillStyle = `rgb(${80 + value}, ${160 + value / 3}, 255)`;
    spectrumCtx.fillRect(
      i * barWidth,
      spectrumCanvas.height - barHeight,
      Math.max(1, barWidth - 1),
      barHeight
    );
  }
}

function applyAudioReactiveGlitch() {
  if (!imageLoaded || !loadedImage || !analyser || !frequencyData) {
    return;
  }

  analyser.getByteFrequencyData(frequencyData);

  const averageVolume = getAverageVolume();

  const glitchIntensity = Number(glitchIntensitySlider.value);
  const rgbShift = Number(rgbShiftSlider.value);
  const waveDistortion = Number(waveDistortionSlider.value);
  const brightnessPulse = Number(brightnessPulseSlider.value);

  const width = glitchCanvas.width;
  const height = glitchCanvas.height;

  glitchCtx.clearRect(0, 0, width, height);

  const pulseBrightness = 1 + averageVolume * (brightnessPulse / 100);
  glitchCtx.filter = `brightness(${pulseBrightness})`;

  glitchCtx.drawImage(loadedImage, 0, 0, width, height);
  glitchCtx.filter = "none";

  const lineCount = Math.floor(10 + averageVolume * glitchIntensity);

  for (let i = 0; i < lineCount; i++) {
    const y = Math.floor(Math.random() * height);
    const sliceHeight = Math.floor(4 + Math.random() * 22);
    const offset = Math.floor((Math.random() - 0.5) * glitchIntensity * averageVolume * 3);

    glitchCtx.drawImage(
      glitchCanvas,
      0,
      y,
      width,
      sliceHeight,
      offset,
      y,
      width,
      sliceHeight
    );
  }

  const shift = Math.floor(rgbShift * averageVolume);

  if (shift > 0) {
    glitchCtx.globalCompositeOperation = "screen";

    glitchCtx.globalAlpha = 0.35;
    glitchCtx.drawImage(glitchCanvas, shift, 0);

    glitchCtx.globalAlpha = 0.25;
    glitchCtx.drawImage(glitchCanvas, -shift, 0);

    glitchCtx.globalAlpha = 1;
    glitchCtx.globalCompositeOperation = "source-over";
  }

  const waveAmount = waveDistortion * averageVolume;

  if (waveAmount > 1) {
    const source = glitchCtx.getImageData(0, 0, width, height);
    const output = glitchCtx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
      const waveOffset = Math.floor(Math.sin(y * 0.06 + performance.now() * 0.006) * waveAmount);

      for (let x = 0; x < width; x++) {
        const sourceX = Math.min(width - 1, Math.max(0, x + waveOffset));

        const sourceIndex = (y * width + sourceX) * 4;
        const outputIndex = (y * width + x) * 4;

        output.data[outputIndex] = source.data[sourceIndex];
        output.data[outputIndex + 1] = source.data[sourceIndex + 1];
        output.data[outputIndex + 2] = source.data[sourceIndex + 2];
        output.data[outputIndex + 3] = source.data[sourceIndex + 3];
      }
    }

    glitchCtx.putImageData(output, 0, 0);
  }
}

function animate() {
  drawSpectrum();
  applyAudioReactiveGlitch();

  animationId = requestAnimationFrame(animate);
}

function resetOutputImage() {
  if (imageLoaded && loadedImage) {
    drawImageToCanvases(loadedImage);
  }

  spectrumCtx.clearRect(0, 0, spectrumCanvas.width, spectrumCanvas.height);
}

imageInput.addEventListener("change", function () {
  const file = imageInput.files[0];

  if (!file) {
    return;
  }

  loadImage(file);
});

audioInput.addEventListener("change", function () {
  const file = audioInput.files[0];

  if (!file) {
    return;
  }

  loadAudio(file);
});

playButton.addEventListener("click", async function () {
  if (!imageLoaded) {
    alert("Najprv nahraj obrázok.");
    return;
  }

  if (!audioLoaded) {
    alert("Najprv nahraj audio súbor.");
    return;
  }

  setupAudioAnalyzer();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  cancelAnimationFrame(animationId);

  await audioPlayer.play();
  animate();
});

stopButton.addEventListener("click", function () {
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  cancelAnimationFrame(animationId);
  resetOutputImage();
});

downloadButton.addEventListener("click", function () {
  if (!imageLoaded) {
    alert("Najprv nahraj obrázok.");
    return;
  }

  const link = document.createElement("a");

  link.download = "audio-reactive-glitch.png";
  link.href = glitchCanvas.toDataURL("image/png");
  link.click();
});

window.addEventListener("resize", function () {
  if (imageLoaded && loadedImage) {
    drawImageToCanvases(loadedImage);
  }

  resizeSpectrumCanvas();
});

resizeSpectrumCanvas();