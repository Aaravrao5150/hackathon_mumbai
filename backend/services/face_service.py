import cv2
from deepface import DeepFace
import os

BASE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../")
)

def verify_face():

    cam = cv2.VideoCapture(0)
    ret, frame = cam.read()
    cam.release()

    live = os.path.join(BASE, "live.jpg")
    cv2.imwrite(live, frame)

    ref = os.path.join(
        BASE, "dataset/registered_faces/me.jpg"
    )

    try:
        result = DeepFace.verify(
            img1_path=ref,
            img2_path=live,
            model_name="VGG-Face"
        )

        return result["verified"]

    except Exception as e:
        print("FACE ERROR:", e)
        return False
