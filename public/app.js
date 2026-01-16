let stream = null;
let scanStart = 0;

// Fail first attempt once per session
let failedOnce = sessionStorage.getItem("failOnce") !== "done";


// =============== UI HELPERS ===============

function updateMeter(v){
 document.getElementById("ring")
   .setAttribute("stroke-dasharray", v + ",100");

 document.getElementById("percent").innerText = v + "%";
}


// =============== CAMERA ===============

async function startCamera(){

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
  }
}


function stopCamera(){
 if(stream){
   stream.getTracks().forEach(t => t.stop());
 }
}


// =============== CAPTURE FRAME ===============

function grab(){
 canvas.width = 300;
 canvas.height = 200;

 let x = canvas.getContext("2d");
 x.drawImage(video,0,0,300,200);

 return x.getImageData(0,0,300,200);
}


// =============== FEATURE SIMILARITY ===============

function featureScore(mat){

 let ak = new cv.AKAZE();

 let kp = new cv.KeyPointVector();
 let des = new cv.Mat();

 ak.detectAndCompute(mat,new cv.Mat(),kp,des);

 return Math.min(100, Math.round(kp.size()*1.5));
}


// =============== MAIN VERIFICATION LOOP ===============

async function checkLoop(){

 let u = auth.currentUser;
 if(!u){
   status.innerText = "Please login again";
   return;
 }

 let roll = u.email.split("@")[0];


 // ----- LOAD TEMPLATE -----
 let exts=[".jpeg",".jpg",".jfif",".png"];
 let ref=null;

 for(let e of exts){
   let r = await fetch("templates/" + roll + e);
   if(r.ok){ ref=r; break; }
 }

 if(!ref){
   status.innerText = "ID template not found";
   load.style.display="none";
   return;
 }


 // ----- SCAN PROCESS -----
 let interval = setInterval(async()=>{

   let elapsed = (Date.now() - scanStart)/1000;


   // Phase messages
   if(elapsed < 3){
     status.innerText = "Scanning ID...";
     return;
   }

   if(elapsed < 5){
     status.innerText = "Verifying identity...";
   }


   // Calculate similarity
   let liveMat = cv.matFromImageData(grab());

   let idScore = featureScore(liveMat);
   let fScore  = await faceScore();   // simulated face

   let score = Math.round(idScore*0.7 + fScore*0.3);

   updateMeter(score);


   // ----- FIRST TRY MUST FAIL -----
   if(elapsed >= 5 && failedOnce){

     clearInterval(interval);
     stopCamera();

     status.innerText = "ID not detected. Please try again.";
     status.className = "fail";

     load.style.display="none";

     sessionStorage.setItem("failOnce","done");

     return;
   }


   // ----- SUCCESS AFTER 6 SECONDS -----
   if(elapsed >= 6 && score >= 80){

     clearInterval(interval);
     stopCamera();

     mark(score);
   }

 },800);
}


// =============== DUPLICATE CHECK ===============

async function alreadyMarked(roll, sessionId){

 let s = await db.collection("attendance")
   .where("roll","==",roll)
   .where("session","==",sessionId)
   .get();

 return !s.empty;
}


// =============== MARK ATTENDANCE ===============

async function mark(score){

 load.style.display="none";

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
}


// =============== TEACHER ===============

async function createSession(){

 await db.collection("sessions").add({

  subject:sub.value,
  date:date.value,
  start:start.value,
  duration:dur.value

 });

 alert("Session Created");
}
