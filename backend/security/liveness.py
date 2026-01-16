import random
import time

def challenge():
    return random.choice(["blink", "left", "right", "smile"])

def verify_response(action):
    # simulated – in real system use eye aspect ratio
    time.sleep(1)
    return True
