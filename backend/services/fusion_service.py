
def evaluate(face, id_data, fingerprint, live):
    if not id_data:
        return "FAIL", "ID not detected"

    if face and fingerprint and live:
        return "SUCCESS", "Multi-factor verified"

    if face and not fingerprint:
        return "SUSPICIOUS", "Fingerprint mismatch"

    return "FAIL", "Proxy attempt detected"
