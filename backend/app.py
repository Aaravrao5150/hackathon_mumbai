from flask import Flask, request, jsonify, render_template
import sqlite3, datetime

app = Flask(__name__, template_folder="../frontend/templates")

DB="database.db"

def init():
    con=sqlite3.connect(DB)
    con.execute("""
    CREATE TABLE IF NOT EXISTS logs(
      student TEXT,
      time TEXT,
      status TEXT,
      trust INT
    )
    """)
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
