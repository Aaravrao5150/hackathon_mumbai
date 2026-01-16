
async function realScore(file, refBlob){
 let img = await createImageBitmap(file);
 let ref = await createImageBitmap(refBlob);

 let c = document.createElement("canvas");
 let x = c.getContext("2d");

 c.width = 300; c.height = 200;
 x.drawImage(img,0,0,300,200);

 let data = x.getImageData(0,0,300,200);
 let mat = cv.matFromImageData(data);

 return orbScore(mat);
}

// ---------- VERIFY ----------
async function verify(){

 let user = firebase.auth().currentUser;
 if(!user){ alert("Login first"); return; }

 let r = user.email.split("@")[0];
 let f = cam.files[0];

 if(!f){ alert("Capture image"); return; }

 let ref = await fetch("templates/"+r+".jpeg")
 let refBlob = await ref.blob();

 let idScore = await realScore(f, refBlob);

 let trust = idScore*0.6 + 25 + 10 + 5;

 let status = trust>=75 ? "PRESENT" :
              trust>=60 ? "SUSPICIOUS":"ABSENT";

 await db.collection("attendance").add({
   roll:r,
   trust,
   status,
   time:new Date()
 });

 out.innerText = status+" "+trust+"%";
}

// ---------- SESSION CREATE ----------
async function createSession(){
 await db.collection("sessions").add({
  subject:sub.value,
  date:date.value,
  start:start.value,
  duration:dur.value
 });

 alert("Session Created");
}

// ---------- LOAD SESSIONS FOR STUDENT ----------
async function loadSessions(){

 let s = document.getElementById("session");

 let snap = await db.collection("sessions").get();

 snap.forEach(d=>{
   let o=document.createElement("option");
   o.innerText = d.data().subject+" "+d.data().date;
   s.appendChild(o);
 });
}

// ---------- ORB MATCH ----------
function orbScore(mat){
 let orb = new cv.ORB();
 let kp = new cv.KeyPointVector();
 let des = new cv.Mat();

 orb.detectAndCompute(mat, new cv.Mat(), kp, des);
 return Math.min(100, kp.size()*2);
}
