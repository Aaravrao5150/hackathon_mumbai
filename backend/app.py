from flask import Flask, request, jsonify, render_template
import sqlite3, datetime
from flask import session, redirect

app = Flask(__name__, template_folder="../frontend/templates")

DB="database.db"

def init():
    con=sqlite3.connect(DB)

    con.execute("""
    CREATE TABLE IF NOT EXISTS users(
      id TEXT,
      password TEXT,
      role TEXT
    )
    """)

    con.execute("""
    CREATE TABLE IF NOT EXISTS students(
      roll TEXT,
      name TEXT,
      face_path TEXT,
      id_path TEXT
    )
    """)

    con.execute("""
    CREATE TABLE IF NOT EXISTS sessions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT,
      date TEXT,
      start TEXT,
      duration INT
    )
    """)

    con.execute("""
    CREATE TABLE IF NOT EXISTS attendance(
      roll TEXT,
      session_id INT,
      status TEXT,
      trust INT,
      time TEXT
    )
    """)

    # default accounts
    con.execute("INSERT OR IGNORE INTO users VALUES('teacher','123','teacher')")
    con.execute("INSERT OR IGNORE INTO users VALUES('101','123','student')")
    con.execute("INSERT OR IGNORE INTO users VALUES('102','123','student')")

    con.commit()


@app.route("/")
def home():
    return render_template("index.html")

def anomaly(student):
    con=sqlite3.connect(DB)
    r=con.execute("""
      SELECT COUNT(*) FROM logs
      WHERE student=? AND status='FAIL'
      AND time > datetime('now','-10 minutes')
    """,(student,)).fetchone()[0]

    return r>=3
@app.route("/login",methods=["GET","POST"])
def login():

 if request.method=="POST":

    u=request.form["u"]
    p=request.form["p"]

    con=sqlite3.connect(DB)
    r=con.execute(
      "SELECT role FROM users WHERE id=? AND password=?",
      (u,p)
    ).fetchone()

    if r:
        session["user"]=u
        session["role"]=r[0]

        if r[0]=="teacher":
            return redirect("/teacher")
        return redirect("/student")

 return render_template("login.html")
def teacher_only():
    return session.get("role")!="teacher"

def student_only():
    return session.get("role")!="student"

@app.route("/verify",methods=["POST"])
def verify():

    d=request.json

    trust=d["idScore"]*0.6 + 25*d["face"] + 10*d["finger"] + 5*d["live"]

    if anomaly(d["student"]):
        trust-=20

    status="SUCCESS" if trust>=75 else \
           "SUSPICIOUS" if trust>=60 else "FAIL"

    con=sqlite3.connect(DB)
    con.execute(
      "INSERT INTO logs VALUES (?,?,?,?)",
      (d["student"],
       str(datetime.datetime.now()),
       status,
       int(trust))
    )
    con.commit()

    return jsonify({"status":status,"trust":int(trust)})

@app.route("/stats")
def stats():
    con=sqlite3.connect(DB)
    return jsonify(con.execute(
      "SELECT student,status,COUNT(*) FROM logs GROUP BY student,status"
    ).fetchall())

if __name__=="__main__":
    init()
    app.run()
