let stream = null;

// ===== CAMERA =====
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
    status.innerText = "Camera access denied";
  }
}

function stopCamera() {
  if (stream) stream.getTracks().forEach(t => t.stop());
}

// ===== FRAME =====
function grab() {
  let c = document.getElementById("canvas");
  c.width = 300; c.height = 200;

  let x = c.getContext("2d");
  x.drawImage(video,0,0,300,200);

  return x.getImageData(0,0,300,200);
}

// ===== ORB =====
function orbScore(mat) {
  let orb = cv.ORB_create();   // ✅ correct
  let kp = new cv.KeyPointVector();
  let des = new cv.Mat();

  orb.detectAndCompute(mat,new cv.Mat(),kp,des);

  return Math.min(100, kp.size()*2);
}

// ===== MAIN LOOP =====
async function checkLoop() {

  let user = firebase.auth().currentUser;
  if(!user){
    status.innerText="Login first";
    return;
  }

  let roll = user.email.split("@")[0];

  // ---- load template from PUBLIC folder ----
  let exts=[".jpeg",".jpg",".jfif",".png"];
  let ref=null;

  for(let e of exts){
    let r = await fetch("templates/"+roll+e); // ✅ relative path
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

  let interval=setInterval(()=>{

    let liveMat=cv.matFromImageData(grab());
    let score=orbScore(liveMat);

    status.innerText="Similarity: "+score+"%";

    if(score>=80){
      clearInterval(interval);
      stopCamera();
      markPresent(score);
    }

  },900);
}

// ===== ATTENDANCE =====
async function markPresent(score){

  let last=localStorage.getItem("att");
  if(last && Date.now()-last<20000){
    status.innerText="Wait 20 sec";
    return;
  }
  localStorage.setItem("att",Date.now());

  let roll=firebase.auth()
          .currentUser.email.split("@")[0];

  let snap=await db.collection("sessions").get();

  let now=new Date();
  let valid=false, hours=0;

  snap.forEach(d=>{
    let s=d.data();

    let st=new Date(s.date+"T"+s.start);
    let en=new Date(st.getTime()
           + s.duration*3600000);

    if(now>=st && now<=en){
      valid=true;
      hours=parseFloat(s.duration);
    }
  });

  if(!valid){
    status.innerText="No active session";
    return;
  }

  await db.collection("attendance").add({
    roll, trust:score,
    status:"PRESENT",
    hours, time:new Date()
  });

  status.innerText="PRESENT ✓";
  status.className="success";
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
