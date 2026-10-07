require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public")); 

// Inisialisasi Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();

// Konfigurasi Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Endpoint Pendaftaran
app.post("/api/daftar", async (req, res) => {
  const { nama, email, blok } = req.body;

  try {
    // Simpan ke Firebase
    const pesertaRef = db.ref("lomba_fotografi/peserta").push();
    await pesertaRef.set({
      nama,
      email,
      blok,
      waktu_daftar: new Date().toISOString(),
    });

    // Kirim Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Konfirmasi Pendaftaran Lomba "Merah Putih di Sekitar Kita"',
      text: `Halo ${nama} (Blok ${blok}),\n\nPendaftaran Anda berhasil! Jangan lupa batas akhir pengumpulan karya adalah 15 Agustus jam 20.00 WIB.\n\nSalam, Panitia.`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Pendaftaran sukses!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mendaftar" });
  }
});

// Endpoint untuk mengambil data peserta (Realtime DB)
app.get("/api/peserta", async (req, res) => {
  const snapshot = await db.ref("lomba_fotografi/peserta").once("value");
  res.json(snapshot.val() || {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
