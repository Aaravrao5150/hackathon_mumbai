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
