// Pure logic for Teacher - No Camera, No OpenCV
async function createSession(){
  const subject = document.getElementById("sub").value;
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const duration = document.getElementById("dur").value;

  if(!subject || !date || !start || !duration) {
      alert("Please fill all fields");
      return;
  }

  try {
      await db.collection("sessions").add({
       subject: subject,
       date: date,
       start: start,
       duration: duration,
       created: new Date()
      });
      alert("Session Created Successfully");
  } catch(e) {
      alert("Error: " + e.message);
  }
}