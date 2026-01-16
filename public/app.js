let stream = null;

// ================= CAMERA =================

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = stream;

    // start continuous verification
    checkLoop();

  } catch (e) {
    status.innerText = "Camera access denied";
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
}

// ================= FRAME CAPTURE =================

function grab() {
  let c = document.getElementById("canvas");
  c.width = 300;
  c.height = 200;

  let x = c.getContext("2d");
  x.drawImage(video, 0, 0, 300, 200);

  return x.getImageData(0, 0, 300, 200);
}

// ================= ORB MATCH =================

function orbScore(mat) {
  let orb = cv.ORB_create();

  let kp = new cv.KeyPointVector();
  let des = new cv.Mat();

  orb.detectAndCompute(mat, new cv.Mat(), kp, des);

  return Math.min(100, kp.size() * 2);
}

// ================= MAIN VERIFICATION LOOP =================

async function checkLoop() {

  let user = firebase.auth().currentUser;
  if (!user) {
    status.innerText = "Login first";
    return;
  }

  let roll = user.email.split("@")[0];

  // ----- LOAD TEMPLATE (ANY FORMAT) -----

  let exts = [".jpeg", ".jpg", ".jfif", ".png"];
  let ref = null;

  for (let e of exts) {
    let r = await fetch("/templates/" + roll + e);
    if (r.ok) {
      ref = r;
      break;
    }
  }

  if (!ref) {
    status.innerText = "No template found for " + roll;
    return;
  }

  let refBlob = await ref.blob();
  let refImg = await createImageBitmap(refBlob);

  // convert template to mat
  let c = document.createElement("canvas");
  c.width = 300;
  c.height = 200;

  let x = c.getContext("2d");
  x.drawImage(refImg, 0, 0, 300, 200);

  let refData = x.getImageData(0, 0, 300, 200);
  let refMat = cv.matFromImageData(refData);

  // ----- CONTINUOUS CHECK -----

  let interval = setInterval(() => {

    let liveData = grab();
    let liveMat = cv.matFromImageData(liveData);

    let score = orbScore(liveMat);

    status.innerText = "Similarity: " + score + "%";

    if (score >= 80) {
      clearInterval(interval);
      stopCamera();
      markPresent(score);
    }

  }, 800);
}

// ================= MARK ATTENDANCE =================

async function markPresent(score) {

  // ---- RATE LIMIT ----
  let last = localStorage.getItem("att");
  if (last && Date.now() - last < 20000) {
    status.innerText = "Wait 20 sec before retry";
    return;
  }
  localStorage.setItem("att", Date.now());

  let user = firebase.auth().currentUser;
  let roll = user.email.split("@")[0];

  // ----- CHECK ACTIVE SESSION -----

  let snap = await db.collection("sessions").get();

  let now = new Date();

  let valid = false;
  let hours = 0;

  snap.forEach(d => {

    let s = d.data();

    let start = new Date(s.date + "T" + s.start);
    let end = new Date(start.getTime() + s.duration * 3600 * 1000);

    if (now >= start && now <= end) {
      valid = true;
      hours = parseFloat(s.duration);
    }

  });

  if (!valid) {
    status.innerText = "No active session now";
    return;
  }

  // ----- SAVE RECORD -----

  await db.collection("attendance").add({
    roll: roll,
    trust: score,
    status: "PRESENT",
    hours: hours,
    time: new Date()
  });

  status.innerText = "PRESENT ✓";
  status.className = "success";
}

// ================= TEACHER =================

async function createSession() {

  await db.collection("sessions").add({
    subject: sub.value,
    date: date.value,
    start: start.value,
    duration: dur.value
  });

  alert("Session Created");
}
