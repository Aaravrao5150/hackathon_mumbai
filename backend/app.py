from flask import Flask, request, jsonify, render_template
import sqlite3, datetime

app = Flask(__name__, template_folder="../frontend/templates")

DB="database.db"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/log", methods=["POST"])
def log():
    d=request.json
    con=sqlite3.connect(DB)

    con.execute(
      "INSERT INTO logs VALUES (?,?,?,?)",
      (d["student"],str(datetime.datetime.now()),
       d["status"],str(d["score"]))
    )
    con.commit()

    return jsonify({"ok":True})
