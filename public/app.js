// ===== GLOBAL STATE =====
let stream = null;
let scanStart = 0;
let running = false;
let scanInterval = null;
let savedScore = 0;
let isScanningFinger = false; 

// Anti-Bot: First attempt usually fails to force user to interact naturally
let failedOnce = sessionStorage.getItem("failOnce") !== "done";


// ==========================================
//  UI & VISUALS
// ==========================================

function updateMeter(v) {
    if (isNaN(v) || !v || v < 0) v = 0;
    if (v > 100) v = 100;

    const ring = document.getElementById("ring");
    const text = document.getElementById("percent");

    if (ring && text) {
        ring.setAttribute("stroke-dasharray", v + ",100");
        
        // Color Feedback
        if (v < 30) ring.setAttribute("stroke", "#ff4444");      // Red
        else if (v < 70) ring.setAttribute("stroke", "#ffbb33"); // Orange
        else ring.setAttribute("stroke", "#00C851");             // Green

        text.textContent = v + "%";
    }
}

function updateStatus(msg, type = "") {
    const el = document.getElementById("status");
    if (el) {
        el.innerText = msg;
        el.className = type; 
    }
}

function resetScan() {
    stopCamera();
    running = false;
    scanStart = 0;
    isScanningFinger = false;
    
    // Reset UI Elements
    document.getElementById("cam-section").style.display = "block";
    document.getElementById("meter-container").style.display = "block";
    document.getElementById("fp-container").style.display = "none";
    document.getElementById("startBtn").style.display = "block";
    
    updateMeter(0);
    updateStatus("Ready to scan");
    
    const load = document.getElementById("load");
    if(load) load.style.display = "none";
}


// ==========================================
//  CAMERA LOGIC
// ==========================================

async function startCamera() {
    if (running) return;
    
    // Guard Clause: Prevent running on Teacher Page
    if (!document.getElementById("video")) return;

    running = true;
    updateStatus("Initializing camera...");
    document.getElementById("load").style.display = "block";
    document.getElementById("startBtn").style.display = "none";

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: "environment",
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        const video = document.getElementById("video");
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            setTimeout(() => {
                scanStart = Date.now();
                checkLoop();
            }, 500); 
        };

    } catch (e) {
        console.error(e);
        updateStatus("Camera access denied", "fail");
        document.getElementById("load").style.display = "none";
        document.getElementById("startBtn").style.display = "block";
        running = false;
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
}

function grab() {
    const video = document.getElementById("video");
    const canvas = document.getElementById("canvas");
    canvas.width = 300;
    canvas.height = 200;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, 300, 200);
    return ctx.getImageData(0, 0, 300, 200);
}


// ==========================================
//  INTELLIGENCE (CV + HACK)
// ==========================================

function featureScore(mat) {
    if (typeof cv === 'undefined') return 0;
    try {
        let ak = new cv.AKAZE();
        let kp = new cv.KeyPointVector();
        let desc = new cv.Mat();
        
        ak.detectAndCompute(mat, new cv.Mat(), kp, desc);
        let s = Math.round(kp.size() * 1.5);
        
        // Memory Cleanup
        ak.delete(); kp.delete(); desc.delete();
        
        if (!s || isNaN(s)) return 0;
        return Math.min(100, s);
    } catch (e) { return 0; }
}

// ==========================================
//  MAIN LOOP
// ==========================================

async function checkLoop() {
    const u = auth.currentUser;
    if (!u) {
        updateStatus("Session expired", "fail");
        running = false;
        return;
    }

    // Attempt to verify ID template exists (optional simulation)
    const roll = u.email.split("@")[0];

    scanInterval = setInterval(async () => {
        if (!running) return;

        let elapsed = (Date.now() - scanStart) / 1000;

        // Feedback Phase (0-2s)
        if (elapsed < 2) {
            updateStatus("Align Face & ID Card...");
            return;
        }

        let liveMat = null;
        let idScore = 0;
        let fScore = 0;

        try {
            const imageData = grab();
            liveMat = cv.matFromImageData(imageData);
            
            // 1. ID Check (OpenCV)
            idScore = featureScore(liveMat); 
            
            // 2. Liveness Check (Motion Hack from face.js)
            fScore = await faceScore();

        } catch (e) { } 
        finally { if (liveMat) liveMat.delete(); }

        // Calculate Score
        let score = Math.round((idScore * 0.6) + (fScore * 0.4));
        updateMeter(score);

        // Feedback
        if (fScore < 15) updateStatus("Move slightly / Check Light", "warn");
        else if (idScore < 20) updateStatus("ID Card Unclear", "warn");
        else updateStatus("Verifying Identity...", "success");


        // --- AUTO CAPTURE LOGIC ---
        
        // If >2 seconds elapsed AND Score >= 75% -> SUCCESS
        if (elapsed > 2 && score >= 75) {
            clearInterval(scanInterval);
            stopCamera();
            savedScore = score;
            startFingerprintPhase(); // Go to fake biometric
            return;
        }

        // Timeout (25s)
        if (elapsed > 25) {
            clearInterval(scanInterval);
            stopCamera();
            updateStatus("Timed Out. Try better lighting.", "fail");
            document.getElementById("startBtn").style.display = "block";
            running = false;
        }

    }, 500); 
}


// ==========================================
//  FAKE FINGERPRINT SIMULATION
// ==========================================

function startFingerprintPhase() {
    // 1. Hide Camera UI
    document.getElementById("cam-section").style.display = "none";
    document.getElementById("meter-container").style.display = "none";
    document.getElementById("status").style.display = "none";
    
    // 2. Show Fingerprint UI
    document.getElementById("fp-container").style.display = "block";
}

function scanFinger() {
    if(isScanningFinger) return; // Prevent double clicks
    isScanningFinger = true;

    const icon = document.getElementById("fp-icon");
    const bar = document.getElementById("fp-scan-bar");
    const msg = document.getElementById("fp-msg");
    
    // Visuals
    icon.className = "fp-active";
    bar.className = "scanning";
    bar.style.display = "block";
    msg.innerText = "Analyzing Biometrics...";
    msg.style.color = "#2563ff";

    // 3 Second Fake Timer
    setTimeout(() => {
        bar.style.display = "none";
        msg.innerText = "AUTHENTICATED";
        msg.style.color = "#00C851";
        
        // Submit
        markAttendance(savedScore);
    }, 3000);
}


// ==========================================
//  DATABASE WRITES (Now Saves Real Subjects)
// ==========================================

async function alreadyMarked(roll, sessionId) {
    const s = await db.collection("attendance")
        .where("roll", "==", roll)
        .where("session", "==", sessionId)
        .get();
    return !s.empty;
}

async function markAttendance(score) {
    const user = auth.currentUser;
    const roll = user.email.split("@")[0];
    const now = new Date();

    let sid = null;
    let hrs = 0;
    let late = false;
    let finalSubject = "General Session"; // Default name

    try {
        // Find the active session
        const snap = await db.collection("sessions").get();
        
        snap.forEach(d => {
            const s = d.data();
            const start = new Date(s.date + "T" + s.start);
            const end = new Date(start.getTime() + s.duration * 3600 * 1000);

            if (now >= start && now <= end) {
                sid = d.id;
                hrs = s.duration;
                // CAPTURE THE REAL SUBJECT NAME
                if(s.subject) finalSubject = s.subject;
                
                if ((now - start) > 15 * 60 * 1000) late = true;
            }
        });

        // Show status again
        const statusEl = document.getElementById("status");
        statusEl.style.display = "block"; 

        if (!sid) {
            updateStatus("No Active Class Found", "fail");
            setTimeout(resetScan, 3000);
            return;
        }

        if (await alreadyMarked(roll, sid)) {
            updateStatus("Already Marked Today", "warn");
            setTimeout(resetScan, 3000);
            return;
        }

        // SAVE DATA (Including the Subject Name)
        await db.collection("attendance").add({
            roll: roll,
            session: sid,
            subject: finalSubject, // <--- SAVED!
            trust: score,
            status: late ? "LATE" : "PRESENT",
            hours: hrs,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Final Success Screen
        document.getElementById("fp-container").style.display = "none";
        document.getElementById("meter-container").style.display = "block";
        updateMeter(100);
        updateStatus(late ? "MARKED LATE" : "MARKED PRESENT", late ? "warn" : "success");

    } catch (e) {
        console.error(e);
        updateStatus("Database Error", "fail");
    }
}


// ==========================================
//  TEACHER LOGIC
// ==========================================

async function createSession() {
    const sub = document.getElementById("sub");
    const date = document.getElementById("date");
    const start = document.getElementById("start");
    const dur = document.getElementById("dur");

    if (!sub || !date) return; // Guard

    if (!sub.value || !date.value || !start.value || !dur.value) {
        alert("Please fill all fields");
        return;
    }

    try {
        await db.collection("sessions").add({
            subject: sub.value,
            date: date.value,
            start: start.value,
            duration: parseFloat(dur.value),
            created: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Session Created: " + sub.value);
    } catch (e) {
        alert("Error: " + e.message);
    }
}