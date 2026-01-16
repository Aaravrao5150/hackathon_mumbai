def evaluate(face, id_data, fingerprint, live):

    if not id_data:
        return "FAIL", "ID not detected"

    score = 0

    # ID MATCH IS PRIMARY
    score += 60

    if face:
        score += 25

    if fingerprint:
        score += 10

    if live:
        score += 5

    if score >= 70:
        return "SUCCESS", f"Trust {score}%"

    if 50 <= score < 70:
        return "SUSPICIOUS", f"Low trust {score}%"

    return "FAIL", "Proxy suspected"
