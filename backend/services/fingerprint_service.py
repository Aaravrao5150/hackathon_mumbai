
fingerprint_tokens = {
    "STU101": "fp_token_123",
    "STU102": "fp_token_456"
}

def verify_fingerprint(student_id):
    scanned = "fp_token_123"
    return fingerprint_tokens.get(student_id) == scanned
