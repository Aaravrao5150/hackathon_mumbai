let stream = null;
let scanStart = 0;
let running = false;

// first attempt forced fail logic (Retained from your code)
let failedOnce = sessionStorage.getItem("failOnce") !== "done";        


// ===== UI HELPERS =====

function updateMeter(v){
 if(v < 12) v = 12;
 document.getElementById("ring").setAttribute("stroke-dasharray", v + ",100");
 document.getElementById("percent").innerText = v + "%";
}


function resetScan(){
 stopCamera();
 running = false;
 scanStart = 0;
 updateMeter(0);
 status.innerText = "Ready to scan";
 status.className = "";
 load.style.display = "none";
}


// ===== CAMERA =====

async function startCamera(){
 if(running) return;
 running = true;

 status.innerText = "Initializing camera...";
 load.style.display = "block";

 try{
  stream = await navigator.mediaDevices.getUserMedia({
    video:{ facingMode:"environment" }
  });
  video.srcObject = stream;
  
  // Wait for video to actually load data
  video.onloadedmetadata = () => {
      scanStart = Date.now();
      checkLoop();
  };

 }catch(e){
  status.innerText = "Camera access denied";
  load.style.display = "none";
  running = false;
 }
}


function stopCamera(){
 if(stream){
   stream.getTracks().forEach(t => t.stop());
 }
}


// ===== CAPTURE =====

function grab(){
 canvas.width = 300;
 canvas.height = 200;
 let x = canvas.getContext("2d", { willReadFrequently: true });
 x.drawImage(video,0,0,300,200);
 return x.getImageData(0,0,300,200);
}


// ===== SIMILARITY (OPENCV) =====

function featureScore(mat){
 try{
  let ak = new cv.AKAZE();
  let kp = new cv.KeyPointVector();
  
  // Detect ID card features
  ak.detectAndCompute(mat,new cv.Mat(),kp,new cv.Mat());
  
  let s = Math.round(kp.size()*1.5);
  
  // Clean up OpenCV C++ Objects immediately
  ak.delete(); 
  kp.delete();

  if(!s || isNaN(s)) return 10;
  return Math.min(100,s);

 }catch(e){
  console.log("CV Error", e);
  return 0; 
 }
}


// ===== MAIN INTELLIGENCE LOOP =====

async function checkLoop(){

 let u = auth.currentUser;
 if(!u){
   status.innerText = "Please login again";
   running = false;
   return;
 }

 let roll = u.email.split("@")[0];

 // load template ID
 let exts=[".jpeg",".jpg",".jfif",".png"];
 let ref=null;

 for(let e of exts){
   let r = await fetch("templates/" + roll + e);
   if(r.ok){ ref=r; break; }
 }

 if(!ref){
   status.innerText = "ID template not found";
   load.style.display="none";
   running=false;
   return;
 }


 // Start the scan loop
 let interval = setInterval(async()=>{

   // Check if we stopped
   if(!running) { clearInterval(interval); return; }

   let elapsed = (Date.now() - scanStart)/1000;

   // 1. User Feedback phase
   if(elapsed < 2){
     status.innerText = "Align Face & ID...";
     return;
   }

   // 2. Capture and Score
   let liveMat = null;
   let idScore = 0;
   let fScore = 0;

   try {
       // Convert image to OpenCV Matrix
       liveMat = cv.matFromImageData(grab());
       
       // Get ID Card Score (OpenCV)
       idScore = featureScore(liveMat);
       
       // Get Face Liveness Score (FaceAPI)
       fScore  = await faceScore();

       // CRITICAL: Free memory
       liveMat.delete(); 

   } catch(e) {
       console.log("Loop Error", e);
       if(liveMat) liveMat.delete();
   }


   // 3. Weighted Average (Face is 40%, ID Card is 60%)
   let score = Math.round(idScore*0.6 + fScore*0.4);
   updateMeter(score);

   // 4. Intelligent Status Updates
   if(fScore < 20) status.innerText = "Face not detected";
   else if(idScore < 20) status.innerText = "ID Card unclear";
   else status.innerText = "Verifying...";


   // 5. Verification Logic

   // First Attempt Force Fail (Anti-Bot Pattern)
   if(elapsed >= 5 && failedOnce){
     clearInterval(interval);
     stopCamera();
     status.innerText = "Hold steady. Please try again.";
     status.className = "fail";
     load.style.display="none";
     running=false;
     sessionStorage.setItem("failOnce","done");
     return;
   }

   // Success Condition: High Score AND Minimum 4 seconds elapsed
   if(elapsed >= 4 && score >= 70){
     clearInterval(interval);
     stopCamera();
     mark(score);
   }
   
   // Timeout Condition
   if(elapsed > 20){
       clearInterval(interval);
       stopCamera();
       status.innerText = "Timed out. Try better lighting.";
       status.className = "fail";
       running = false;
   }

 }, 600); // Run every 600ms to save CPU
}


// ===== DUPLICATE CHECK =====

async function alreadyMarked(roll, sessionId){
 let s = await db.collection("attendance")
   .where("roll","==",roll)
   .where("session","==",sessionId)
   .get();
 return !s.empty;
}


// ===== MARK ATTENDANCE =====

async function mark(score){

 load.style.display="none";
 running=false;

 let r = auth.currentUser.email.split("@")[0];
 let snap = await db.collection("sessions").get();
 let now = new Date();

 let sid=null, hrs=0, late=false;

 snap.forEach(d=>{
   let s = d.data();
   let st = new Date(s.date+"T"+s.start);
   let en = new Date(st.getTime()+s.duration*3600*1000);

   if(now>=st && now<=en){
     sid = d.id;
     hrs = s.duration;
     if(now-st > 10*60*1000) late = true;
   }
 });


 if(!sid){
   status.innerText = "No active session found";
   status.className = "warn";
   return;
 }

 if(await alreadyMarked(r,sid)){
   status.innerText = "Already marked today";
   status.className = "warn";
   return;
 }

 await db.collection("attendance").add({
   roll:r,
   session:sid,
   trust:score, // We now store the REAL AI score
   status: late ? "LATE" : "PRESENT",
   hours:hrs,
   time:new Date()
 });

 status.innerText = "ATTENDANCE MARKED";
 status.className = late ? "warn" : "success";
 updateMeter(100);
}


// ===== TEACHER FUNCTIONS =====

async function createSession(){
 await db.collection("sessions").add({
  subject:sub.value,
  date:date.value,
  start:start.value,
  duration:dur.value
 });
 alert("Session Created");
}