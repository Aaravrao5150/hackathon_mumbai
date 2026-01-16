from cryptography.fernet import Fernet

KEY = Fernet.generate_key()
f = Fernet(KEY)

def encrypt(text):
    return f.encrypt(text.encode()).decode()

def decrypt(text):
    return f.decrypt(text.encode()).decode()
