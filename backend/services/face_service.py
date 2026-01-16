import cv2
from deepface import DeepFace
import os

BASE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../")
)

def verify_face():

    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
    ret, frame = cam.read()
    cam.release()

    if not ret:
        return False

    live = os.path.join(BASE, "live_face.jpg")
    cv2.imwrite(live, frame)

    ref = os.path.join(BASE, "dataset/registered_faces/me.jpg")

    # If reference not present → skip face
    if not os.path.exists(ref):
        print("No face reference → skipping")
        return True

    try:
        result = DeepFace.verify(
            img1_path=ref,
            img2_path=live,
            model_name="VGG-Face",
            enforce_detection=False   # important
        )

        return result.get("verified", False)

    except Exception as e:
        print("Face module skipped:", e)
        return False
