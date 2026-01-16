Markdown

# 🏛️ SMART CAMPUS: Intelligent Attendance System
### Multi-Factor Biometric Verification & Geo-Fencing Solution

> **A next-generation web application designed to eliminate proxy attendance using Client-Side AI, Geolocation Integrity, and Simulated Biometric Workflows.**

---

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [The "Intelligence" (Technical Deep Dive)](#-the-intelligence-technical-deep-dive)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)

---

## 🚀 Project Overview

**Smart Campus** is a secure, browser-based attendance management system designed for modern educational institutions. Unlike traditional systems that rely on expensive hardware scanners, this solution runs entirely in the browser using standard webcams and mobile devices.

The system addresses the critical issue of **"Proxy Attendance"** (students marking attendance for absent friends) by implementing a **Multi-Factor Authentication (MFA)** flow:
1.  **Something You Are:** Facial Liveness & ID Card Verification.
2.  **Where You Are:** GPS Geofencing (Haversine Formula).
3.  **What You Do:** Biometric Interaction (Simulated Fingerprint).

---

## ✨ Key Features

### 🛡️ Security & Anti-Proxy
* **GPS Geofencing:** Prevents students from marking attendance from dorms/off-campus. Uses the **Haversine Formula** to calculate physical distance from the classroom coordinates with high precision.
* **Real-Time Liveness Detection:** Uses a pixel-delta algorithm to detect micro-movements, ensuring a live human is present (not a static photo).
* **ID Card Scanning:** Integrates **OpenCV.js** (AKAZE features) to detect and match Student ID cards in the video feed.

### 💻 User Experience (UI/UX)
* **Glassmorphism Design:** Modern, translucent UI with professional scanning animations.
* **Hacker-Style Overlay:** Dynamic "Laser Scan" animations and floating confidence meters for a high-tech feel.
* **Auto-Capture Logic:** Automatically snaps the verification image once the AI confidence score breaches the 75% threshold.
* **Simulated Biometrics:** A realistic "Touch ID" style interaction to demonstrate future hardware integration.

### 📊 Dashboard & Analytics
* **Real-Time Reporting:** Faculty dashboard updates instantly via Firestore listeners.
* **Smart Mocking:** Automatically handles missing or legacy data by assigning professional labels (e.g., "Lab Session") to keep the UI clean.
* **Session Management:** Teachers can create time-bound sessions (e.g., "Physics - 10:00 AM") that automatically expire.

---

## 🧠 The "Intelligence" (Technical Deep Dive)

This project combines **Real Implementation** with **Strategic Simulation** to demonstrate a production-grade workflow.

### 1. The ID Verification (Real)
We use **OpenCV.js** (WebAssembly) to process video frames in real-time.
* **Algorithm:** AKAZE (Accelerated-KAZE) feature detection.
* **Process:** The system extracts keypoints from the live video and compares them against a template database.
* **Result:** High accuracy in detecting if an ID card is held up to the camera.

### 2. The Liveness Check (Heuristic Hack)
To ensure the system runs smoothly on mobile devices without heavy ML models, we implemented a **Motion-Energy Algorithm**.
* **Logic:** We analyze the RGB channel difference between consecutive frames (`Frame_T` vs `Frame_T-1`).
* **Thresholding:**
    * *Zero Motion:* Detected as a static photo attack (Spoof).
    * *Micro Motion:* Detected as a living human (Pass).
    * *High Motion:* Detected as camera shaking (Retry).

### 3. The Fingerprint Step (Simulated)
As browsers cannot access physical fingerprint scanners directly:
* **Workflow:** We implement a "Touch & Hold" interaction pattern.
* **Purpose:** To demonstrate where a WebAuthn or physical biometric API would integrate in a real-world deployment.

---

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3 (Variables, Animations), JavaScript (ES6+).
* **Backend (Serverless):** Google Firebase (Auth & Firestore).
* **Computer Vision:** OpenCV.js (4.8.0).
* **Geolocation:** HTML5 Geolocation API.
* **Hosting:** Firebase Hosting.

---

## 📂 Directory Structure

```text
/public
├── app.js            # Main Logic (Camera, GPS, Validation)
├── face.js           # Liveness/Motion Detection Algorithms
├── firebase-init.js  # Database Configuration
├── student.html      # Student Scanning Interface
├── teacher.html      # Session Creation Portal
├── dashboard.html    # Analytics View
├── style.css         # Scanning Animations & Glassmorphism
└── templates/        # Reference ID Card Images
⚡ Installation & Setup
Prerequisites: Node.js installed and a Firebase Project created.

Clone the Repository

Bash

git clone [https://github.com/your-username/smart-campus-attendance.git](https://github.com/your-username/smart-campus-attendance.git)
cd smart-campus-attendance
Install Firebase Tools

Bash

npm install -g firebase-tools
Initialize Firebase

Bash

firebase login
firebase init
# Select: Firestore, Hosting
# Select: Use an existing project (Pick your project)
Local Testing

Bash

firebase serve
Access the app at http://localhost:5000.

📸 Usage Guide
👨‍🎓 For Students
Login: Use your student email (e.g., 101@college.edu).

Pre-Check: The system verifies your GPS location. If you are >500m from campus, access is denied.

Scan: Align your face and ID card. The Blue Laser will scan you.

Auto-Verify: Hold steady. Once confidence > 75%, the camera stops.

Biometric: Tap the Fingerprint icon to finalize attendance.

👩‍🏫 For Teachers
Login: Use a teacher credential.

Create Session: Select Subject (e.g., "CS101"), Date, and Duration.

Monitor: Go to the Dashboard to see real-time "PRESENT" / "LATE" markers appearing as students scan in.

📄 License
This project is developed for educational purposes and is available under the MIT License.

Note: This system uses simulated data for fingerprint authentication and template matching for demonstration purposes. In a production environment, this would be replaced by WebAuthn APIs and a secure vector database.