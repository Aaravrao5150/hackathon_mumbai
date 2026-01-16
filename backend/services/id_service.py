import cv2
from deepface import DeepFace
import os
import time

BASE = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../")
)

def match_id(live):

    folder = os.path.join(BASE, "dataset/id_cards")

    for f in os.listdir(folder):

        path = os.path.join(folder, f)

        try:
            r = DeepFace.verify(
                img1_path=live,
                img2_path=path,
                model_name="VGG-Face"
            )

            if r["verified"]:
                return f.split(".")[0]   # student id

        except:
            pass

    return None


def scan_id():

    cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    start = time.time()
    live = os.path.join(BASE, "live_id.jpg")

    while time.time() - start < 8:

        ret, frame = cam.read()
        if not ret:
            continue

        cv2.imshow("Show ID Card", frame)

        cv2.imwrite(live, frame)

        sid = match_id(live)

        if sid:
            cam.release()
            cv2.destroyAllWindows()

            return {
                "id": sid,
                "type": "IMAGE_MATCH"
            }

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cam.release()
    cv2.destroyAllWindows()

    return None
