from flask import Flask, render_template, jsonify
import sqlite3, datetime, os, sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.id_service import scan_id
from services.face_service import verify_face
from services.fingerprint_service import verify_fingerprint
from services.fusion_service import evaluate
from security.liveness import check

app = Flask(__name__, template_folder="../frontend/templates")

DB = os.path.join(os.path.dirname(__file__), "database.db")


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


def log(student, status, reason):
    con = sqlite3.connect(DB)
    con.execute(
        "INSERT INTO logs VALUES (?,?,?,?)",
        (student, str(datetime.datetime.now()), status, reason)
    )
    con.commit()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/mark", methods=["POST"])
def mark():

    id_data = scan_id()

    face = False
    if id_data and "id" in id_data:
        face = verify_face()

    finger = verify_fingerprint(
        id_data["id"] if id_data and "id" in id_data else None
    )

    live = check()

    result, reason = evaluate(face, id_data, finger, live)

    student = id_data["id"] if id_data and "id" in id_data else "UNKNOWN"

    log(student, result, reason)

    return jsonify({
        "status": result,
        "reason": reason,
        "student": student
    })


@app.route("/stats")
def stats():

    con = sqlite3.connect(DB)

    data = con.execute("""
        SELECT status, COUNT(*)
        FROM logs
        GROUP BY status
    """).fetchall()

    return jsonify(data)


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
