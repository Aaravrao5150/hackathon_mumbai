def evaluate(face, id_data, fingerprint, live):

    if not id_data:
        return "FAIL", "ID not detected"

    if "error" in id_data:
        return "FAIL", id_data["error"]

    score = 0
    score += 40 if face else 0
    score += 40 if fingerprint else 0
    score += 20 if live else 0

    if score >= 80:
        return "SUCCESS", f"Trust {score}%"

    if 40 <= score < 80:
        return "SUSPICIOUS", f"Low trust {score}%"

    return "FAIL", "Proxy suspected"
