const app=firebase.initializeApp({
 apiKey:"AIzaSyDpO6PNv7PULWEHmyD-WbobWzUA-J8IK7U",
 authDomain:"attendance-smart-86930.firebaseapp.com",
 projectId:"attendance-smart-86930"
})


const auth = firebase.auth();

function login(){
 auth.signInWithEmailAndPassword(
   email.value,
   pass.value
 )
 .then(()=>{

   if(email.value.includes("teacher"))
      location="teacher.html";
   else
      location="student.html";

 })
 .catch(e=>alert(e.message));
}