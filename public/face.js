// ===== THE LIGHTWEIGHT "HACK" =====

let prevPixels = null;
let motionScore = 0;

// Re-use a tiny canvas to save memory
const tinyCanvas = document.createElement('canvas');
const w = 32; // Low res for speed
const h = 24;
tinyCanvas.width = w;
tinyCanvas.height = h;
const tinyCtx = tinyCanvas.getContext('2d', { willReadFrequently: true });

async function faceScore() {
  
  if (!window.video || window.video.paused || window.video.ended) return 0;

  // 1. Draw tiny frame
  tinyCtx.drawImage(window.video, 0, 0, w, h);
  let frame = tinyCtx.getImageData(0, 0, w, h);
  let currentPixels = frame.data;

  // 2. CHECK LIGHTING (Too dark/bright = No Face)
  // We sample every 4th pixel for speed
  let totalBrightness = 0;
  let count = 0;
  
  for(let i=0; i<currentPixels.length; i+=16) { 
      totalBrightness += currentPixels[i]; // Red channel
      count++;
  }
  let avgLight = totalBrightness / count;

  // Pitch black (<20) or Blinding white (>240)
  if(avgLight < 10 || avgLight > 240) {
      return 0;
  }

  // 3. CHECK LIVENESS (Motion Detection)
  // We compare this frame with the previous one
  if (prevPixels) {
      let diff = 0;
      // Check Green channel (i+1) for difference
      for (let i = 0; i < currentPixels.length; i += 16) {
          diff += Math.abs(currentPixels[i+1] - prevPixels[i+1]);
      }
      
      let movement = diff / count;

      // LOGIC: 
      // - 0 movement = Static Photo (FAIL)
      // - >10 movement = Shaking phone/Running (FAIL)
      // - 0.5 to 5.0 = Breathing/Holding phone (PASS)
      
      if(movement > 0.2 && movement < 8) {
          motionScore += 8; // Boost score fast if real
      } else {
          motionScore -= 3; // Drop score if static or chaotic
      }
  }

  // Store current for next comparison
  // We must COPY the data, otherwise 'prevPixels' points to the same reference
  prevPixels = new Uint8ClampedArray(currentPixels);

  // Clamp score
  if(motionScore < 0) motionScore = 0;
  if(motionScore > 100) motionScore = 100;

  return motionScore;
}