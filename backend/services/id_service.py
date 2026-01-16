import cv2
import os, time
import numpy as np
from skimage.metrics import structural_similarity as ssim

BASE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../")
)

# ----- Similarity Function -----

def similarity(a, b):

    i1 = cv2.imread(a, 0)
    i2 = cv2.imread(b, 0)

    if i1 is None or i2 is None:
        return 0

    i1 = cv2.resize(i1, (300,200))
    i2 = cv2.resize(i2, (300,200))

    s = ssim(i1, i2)
    return int(s * 100)


# ----- MAIN FUNCTION -----

def scan_id_for(student):

    print("Starting scan for:", student)

    # ----- FIND TEMPLATE WITH ANY EXTENSION -----
    ref = None

    for ext in ["jpg", "jpeg", "png"]:
        p = os.path.join(BASE, f"dataset/id_cards/{student}.{ext}")

        if os.path.exists(p):
            ref = p
            break

    if not ref:
        print("Template NOT FOUND")
        return {"error": "No template for student"}

    print("Template path:", ref)

    # ----- OPEN CAMERA -----
    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    if not cam.isOpened():
        print("Camera NOT opened")
        return {"error": "Camera not connected"}

    got_frame = False
    start = time.time()

    live = os.path.join(BASE, "live_id.jpg")

    # ----- CAPTURE LOOP -----
    while time.time() - start < 15:

        ret, frame = cam.read()

        if not ret:
            continue

        got_frame = True

        # Draw guide box
        h, w = frame.shape[:2]
        x1, y1 = int(w*0.15), int(h*0.25)
        x2, y2 = int(w*0.85), int(h*0.75)

        cv2.rectangle(frame, (x1, y1), (x2, y2), (255,255,255), 2)

        crop = frame[y1:y2, x1:x2]

        cv2.imwrite(live, crop)

        score = similarity(live, ref)

        # ----- FEEDBACK COLORS -----
        color = (0,0,255)
        text = f"{score}%"

        if score >= 80:
            color = (0,255,0)
            text = f"MATCH {score}%"

        elif score >= 70:
            color = (0,255,255)

        cv2.putText(frame, text, (50,50),
            cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        cv2.imshow("ID Verification", frame)

        # ----- SUCCESS -----
        if score >= 80:
            cam.release()
            cv2.destroyAllWindows()

            return {
                "id": student,
                "score": score
            }

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


    cam.release()
    cv2.destroyAllWindows()

    if not got_frame:
        return {"error": "No webcam frame captured"}

    return None
