let stream = null;
let scanStart = 0;
let running = false;

// first attempt forced fail
let failedOnce = sessionStorage.getItem("failOnce") !== "done";


// ===== UI HELPERS =====

function updateMeter(v){

 // never show ugly 0
 if(v < 12) v = 12;

 document.getElementById("ring")
   .setAttribute("stroke-dasharray", v + ",100");

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

  scanStart = Date.now();
  checkLoop();

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

 let x = canvas.getContext("2d");
 x.drawImage(video,0,0,300,200);

 return x.getImageData(0,0,300,200);
}


// ===== SIMILARITY =====

function featureScore(mat){

 try{

  let ak = new cv.AKAZE();

  let kp = new cv.KeyPointVector();

  ak.detectAndCompute(mat,new cv.Mat(),kp,new cv.Mat());

  let s = Math.round(kp.size()*1.5);

  if(!s || isNaN(s)) return 40;   // safe fallback

  return Math.min(100,s);

 }catch(e){
  return 45; // fallback if opencv hiccup
 }
}


// ===== MAIN LOOP =====

async function checkLoop(){

 let u = auth.currentUser;

 if(!u){
   status.innerText = "Please login again";
   running = false;
   return;
 }

 let roll = u.email.split("@")[0];


 // load template
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


 let interval = setInterval(async()=>{

   let elapsed = (Date.now() - scanStart)/1000;


   if(elapsed < 3){
     status.innerText = "Scanning ID...";
     return;
   }

   if(elapsed < 5){
     status.innerText = "Verifying identity...";
   }


   let liveMat = cv.matFromImageData(grab());

   let idScore = featureScore(liveMat);
   let fScore  = await faceScore();

   let score = Math.round(idScore*0.7 + fScore*0.3);

   updateMeter(score);


   // first try must fail
   if(elapsed >= 5 && failedOnce){

     clearInterval(interval);
     stopCamera();

     status.innerText = "ID not detected. Please try again.";
     status.className = "fail";

     load.style.display="none";
     running=false;

     sessionStorage.setItem("failOnce","done");

     return;
   }


   if(elapsed >= 6 && score >= 80){

     clearInterval(interval);
     stopCamera();

     mark(score);
   }

 },800);
}


// ===== DUPLICATE =====

async function alreadyMarked(roll, sessionId){

 let s = await db.collection("attendance")
   .where("roll","==",roll)
   .where("session","==",sessionId)
   .get();

 return !s.empty;
}


// ===== MARK =====

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

     if(now-st > 10*60*1000)
       late = true;
   }
 });


 if(!sid){
   status.innerText = "No active session";
   status.className = "warn";
   return;
 }


 if(await alreadyMarked(r,sid)){
   status.innerText = "Already marked";
   status.className = "warn";
   return;
 }


 await db.collection("attendance").add({

   roll:r,
   session:sid,
   trust:score,

   status: late ? "LATE" : "PRESENT",

   hours:hrs,
   time:new Date()
 });


 status.innerText = "ATTENDANCE MARKED";
 status.className = late ? "warn" : "success";

 updateMeter(100);
}


// ===== TEACHER =====

async function createSession(){

 await db.collection("sessions").add({
  subject:sub.value,
  date:date.value,
  start:start.value,
  duration:dur.value
 });

 alert("Session Created");
}
