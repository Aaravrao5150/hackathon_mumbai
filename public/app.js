let stream=null;

function updateMeter(v){
 document.getElementById("ring")
   .setAttribute("stroke-dasharray", v+",100");

 document.getElementById("percent").innerText=v+"%";
}

async function startCamera(){
 stream = await navigator.mediaDevices.getUserMedia({
   video:{facingMode:"environment"}
 });

 video.srcObject = stream;
 checkLoop();
}

function grab(){
 canvas.width=300; canvas.height=200;
 let x=canvas.getContext("2d");
 x.drawImage(video,0,0,300,200);
 return x.getImageData(0,0,300,200);
}

function featureScore(mat){
 let ak=new cv.AKAZE();
 let kp=new cv.KeyPointVector();
 ak.detectAndCompute(mat,new cv.Mat(),kp,new cv.Mat());
 return Math.min(100,Math.round(kp.size()*1.5));
}

async function checkLoop(){

 let u=auth.currentUser;
 let roll=u.email.split("@")[0];

 let ref=await fetch("templates/"+roll+".jpeg");
 if(!ref.ok){
   status.innerText="No template found";
   return;
 }

 let interval=setInterval(async()=>{

   let live=cv.matFromImageData(grab());

   let id=featureScore(live);
   let face=await faceScore();

   let score=Math.round(id*0.7+face*0.3);

   updateMeter(score);

   status.innerText="Similarity "+score+"%";

   if(score>=80){
     clearInterval(interval);
     mark(score);
   }

 },1000);
}

async function alreadyMarked(r,sid){
 let s=await db.collection("attendance")
  .where("roll","==",r)
  .where("session","==",sid).get();

 return !s.empty;
}

async function mark(score){

 let r=auth.currentUser.email.split("@")[0];

 let snap=await db.collection("sessions").get();
 let now=new Date();

 let sid=null, hrs=0, late=false;

 snap.forEach(d=>{
   let s=d.data();
   let st=new Date(s.date+"T"+s.start);
   let en=new Date(st.getTime()+s.duration*3600*1000);

   if(now>=st && now<=en){
     sid=d.id; hrs=s.duration;

     if(now-st>10*60*1000) late=true;
   }
 });

 if(!sid){
   status.innerText="No active session";
   return;
 }

 if(await alreadyMarked(r,sid)){
   status.innerText="Already marked";
   return;
 }

 await db.collection("attendance").add({
   roll:r,
   session:sid,
   trust:score,
   status: late?"LATE":"PRESENT",
   hours:hrs,
   time:new Date()
 });

 status.innerText = late?"LATE":"PRESENT";
 status.className = late?"warn":"success";
}

// teacher
async function createSession(){
 await db.collection("sessions").add({
  subject:sub.value,
  date:date.value,
  start:start.value,
  duration:dur.value
 });

 alert("Session Created");
}
