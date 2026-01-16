from flask import Flask, render_template, jsonify, request
import sqlite3, datetime, os, sys, random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.id_service import scan_id_for
from services.face_service import verify_face
from services.fusion_service import evaluate

app = Flask(__name__, template_folder="../frontend/templates")

DB = os.path.join(os.path.dirname(__file__), "database.db")

# -------- DATABASE --------

def init_db():
    con = sqlite3.connect(DB)
    con.execute("""
    CREATE TABLE IF NOT EXISTS logs(
        student TEXT,
        time TEXT,
        status TEXT,
        reason TEXT
    )
    """)
    con.commit()

    # ---- MOCK DATA ----
    cur = con.execute("SELECT COUNT(*) FROM logs")
    if cur.fetchone()[0] == 0:
        for s in ["101","102"]:
            for i in range(6):
                con.execute(
                    "INSERT INTO logs VALUES (?,?,?,?)",
                    (
                        s,
                        str(datetime.datetime.now() - datetime.timedelta(days=i)),
                        random.choice(["SUCCESS","SUSPICIOUS","FAIL"]),
                        "mock record"
                    )
                )
        con.commit()

def log(student, status, reason):
    con = sqlite3.connect(DB)
    con.execute(
        "INSERT INTO logs VALUES (?,?,?,?)",
        (student, str(datetime.datetime.now()), status, reason)
    )
    con.commit()

# -------- ROUTES --------

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/start/<student>", methods=["GET","POST"])
def start(student):

    # if image uploaded from phone
    if request.files:
        img = request.files["img"]
        path = "uploaded.jpg"
        img.save(path)

    id_data = scan_id_for(student)

    if id_data is None:
        return jsonify({"status":"FAIL","reason":"ID not matched","student":student})

    if isinstance(id_data, dict) and "error" in id_data:
        return jsonify({"status":"FAIL","reason":id_data["error"],"student":student})

    result, reason = evaluate(True, id_data, False, True)

    log(student, result, reason)

    return jsonify({
        "status": result,
        "reason": reason,
        "student": student
    })


@app.route("/stats")
def stats():
    con = sqlite3.connect(DB)

    rows = con.execute("""
        SELECT student,status,COUNT(*)
        FROM logs
        GROUP BY student,status
    """).fetchall()

    return jsonify(rows)

if __name__ == "__main__":
    init_db()
    app.run(debug=True)
