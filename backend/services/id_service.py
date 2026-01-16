
import cv2
from pyzbar.pyzbar import decode

def scan_id():
    cam = cv2.VideoCapture(0)
    ret, frame = cam.read()
    cam.release()

    codes = decode(frame)
    for code in codes:
        if code.type in ["CODE128", "CODE39", "QRCODE"]:
            return {"id": code.data.decode(), "type": code.type}
    return None
