// Global flag
let modelsLoaded = false;

// 1. Load the AI Models immediately when script runs
async function loadModels() {
  console.log("Loading AI Models...");
  try {
    // Using a public CDN for the model weights (Tiny Face Detector is fast)
    const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
    
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    // Optional: Load landmarks if you want to detect blinking/smiling later
    // await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

    modelsLoaded = true;
    console.log("AI Models Loaded Successfully");
  } catch (e) {
    console.error("Error loading AI models", e);
  }
}

loadModels();


// 2. The Verification Function
async function faceScore() {
  
  // If models aren't ready or video isn't running, return 0
  if (!modelsLoaded || !window.video || window.video.paused || window.video.ended) {
    return 0;
  }

  try {
    // Detect faces using the Tiny Face Detector (lightweight for mobile)
    const detections = await faceapi.detectAllFaces(
        window.video, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
    );

    // INTELLIGENCE CHECKS:

    // Case A: No face detected
    if (!detections || detections.length === 0) return 0;

    // Case B: Multiple faces detected (Proxy Attempt?)
    // If 2 people are in frame, we lower confidence to prevent marking
    if (detections.length > 1) return 10; 

    // Case C: Single Face - Return confidence score (0.0 to 1.0 -> 0 to 100)
    let confidence = detections[0].score;
    return Math.round(confidence * 100);

  } catch (e) {
    console.log("Face Scan Error", e);
    return 0;
  }
}