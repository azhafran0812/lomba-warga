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

const verifikasiToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login terlebih dahulu.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken; 
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token otentikasi tidak valid.' });
  }
};


app.post('/api/daftar', verifikasiToken, async (req, res) => {
  
  const emailGoogle = req.user.email; 
  const { nama, blok } = req.body;

  try {
    const pesertaRef = db.ref('lomba_fotografi/peserta').push();
    await pesertaRef.set({ 
      nama, 
      email: emailGoogle, 
      blok, 
      waktu_daftar: new Date().toISOString() 
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailGoogle,
      subject: 'Konfirmasi Pendaftaran Lomba "Merah Putih di Sekitar Kita"',
      text: `Halo ${nama} (Blok ${blok}),\n\nPendaftaran Anda menggunakan akun ${emailGoogle} berhasil! Jangan lupa batas akhir pengumpulan karya adalah 15 Agustus jam 20.00 WIB.\n\nSalam, Panitia.`
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Pendaftaran sukses!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mendaftar' });
  }
});

// Endpoint Pendaftaran
app.post('/api/daftar', verifikasiToken, async (req, res) => {
  const emailGoogle = req.user.email; 
  // 1. Tangkap 'judul' dan 'link_foto' dari frontend
  const { nama, blok, judul, link_foto } = req.body;

  try {
    const pesertaRef = db.ref('lomba_fotografi/peserta').push();
    // 2. Simpan juga judul_foto dan link_foto ke Database
    await pesertaRef.set({ 
      nama, 
      email: emailGoogle, 
      blok, 
      judul_foto: judul,     // Tambahan baru
      link_foto: link_foto,  // Tambahan baru
      waktu_daftar: new Date().toISOString() 
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: emailGoogle,
      subject: 'Karya Berhasil Diterima! - Lomba Merah Putih',
      text: `Halo ${nama} (Blok ${blok}),\n\nKarya fotografi Anda yang berjudul "${judul}" telah berhasil masuk ke sistem kami menggunakan akun ${emailGoogle}.\n\nJika juri kesulitan mengakses link foto Anda, kami akan membalas email ini. Pengumuman pemenang akan diinfokan di grup WhatsApp warga.\n\nSalam, Panitia.`
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Pendaftaran sukses!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mendaftar' });
  }
});

// Endpoint untuk mengambil data peserta (Realtime DB)
app.get("/api/peserta", async (req, res) => {
  const snapshot = await db.ref("lomba_fotografi/peserta").once("value");
  res.json(snapshot.val() || {});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
