let stream = null;

// =============== CAMERA ===============

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });

    video.srcObject = stream;

    firebase.auth().onAuthStateChanged(u=>{
      if(u) checkLoop();
    });

  } catch (e) {
    status.innerText = "Camera denied";
  }
}

function stopCamera(){
  if(stream) stream.getTracks().forEach(t=>t.stop());
}

// =============== CAPTURE ===============

function grab(){
  let c = canvas;
  c.width = 300; c.height = 200;
  let x = c.getContext("2d");
  x.drawImage(video,0,0,300,200);
  return x.getImageData(0,0,300,200);
}

// =============== FEATURE MATCH ===============

function featureScore(mat){
  let ak = new cv.AKAZE();
  let kp = new cv.KeyPointVector();
  let des = new cv.Mat();

  ak.detectAndCompute(mat,new cv.Mat(),kp,des);

  return Math.min(100, Math.round(kp.size()*1.5));
}


// =============== ANOMALY ===============

async function anomaly(roll){

  let snap = await db.collection("attendance")
    .where("roll","==",roll)
    .where("status","==","ABSENT")
    .orderBy("time","desc")
    .limit(3).get();

  return snap.size >= 3;
}

// =============== MAIN LOOP ===============

async function checkLoop(){

 let user = firebase.auth().currentUser;
 let roll = user.email.split("@")[0];

 // load template
 let exts=[".jpeg",".jpg",".jfif",".png"];
 let ref=null;

 for(let e of exts){
   let r=await fetch("templates/"+roll+e);
   if(r.ok){ ref=r; break; }
 }

 if(!ref){
   status.innerText="No template for "+roll;
   return;
 }

 let refBlob = await ref.blob();
 let refImg  = await createImageBitmap(refBlob);

 let c=document.createElement("canvas");
 c.width=300; c.height=200;
 let x=c.getContext("2d");
 x.drawImage(refImg,0,0,300,200);

 let refMat=cv.matFromImageData(
   x.getImageData(0,0,300,200)
 );

 let interval=setInterval(async()=>{

   let liveMat=cv.matFromImageData(grab());
   let idScore=featureScore(liveMat);

   let fScore = await faceScore();   // from face.js

   let score=Math.round(idScore*0.7+fScore*0.3);

   status.innerText="Similarity "+score+"%";

   if(score>=80){
     clearInterval(interval);
     stopCamera();
     markPresent(score);
   }

 },900);
}

// =============== MARK ===============

async function markPresent(score){

 let user=firebase.auth().currentUser;
 let roll=user.email.split("@")[0];

 if(await anomaly(roll)){
   status.innerText="Account blocked – repeated fails";
   return;
 }

 // session check
 let snap=await db.collection("sessions").get();
 let now=new Date();
 let sessionId=null, hours=0;

 snap.forEach(d=>{
   let s=d.data();
   let st=new Date(s.date+"T"+s.start);
   let en=new Date(st.getTime()+s.duration*3600*1000);

   if(now>=st && now<=en){
     sessionId=d.id;
     hours=parseFloat(s.duration);
   }
 });

 if(!sessionId){
   status.innerText="No active session";
   return;
 }

 // save attendance
 await db.collection("attendance").add({
   roll, trust:score, status:"PRESENT",
   session:sessionId, hours,
   time:new Date()
 });

 status.innerText="PRESENT ✓";
 status.className = score>=80 ? "success" : "warn";

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
