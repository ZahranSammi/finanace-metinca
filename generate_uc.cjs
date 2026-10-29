const https = require('https');
const fs = require('fs');
const path = require('path');

const puml = `
@startuml
skinparam dpi 300
skinparam backgroundColor white
left to right direction
skinparam packageStyle rectangle

actor "Staff Sales" as sales
actor "Staff Accounting" as acc
actor "Manager Accounting" as mgr

rectangle "Sistem Perekapan Penjualan & Akuntansi Metinca" {
  usecase "Menginput & Mengirim Invoice Baru" as UC1
  usecase "Menandai Invoice Lunas" as UC2
  usecase "Mengajukan Retur / Barang Reject" as UC_RET1
  usecase "Membuat & Mengajukan Purchase Order (PO)" as UC_PO1
  usecase "Memvalidasi / Menolak Invoice" as UC3
  usecase "Menyetujui / Menolak Retur Barang" as UC_RET2
  usecase "Membuat & Mengirim Laporan Detail & Neraca" as UC4
  usecase "Memvalidasi / Menolak Laporan Detail & Neraca" as UC5
  usecase "Menyetujui / Menolak Purchase Order (PO)" as UC_PO2
}

sales --> UC1
sales --> UC2
sales --> UC_RET1
sales --> UC_PO1

acc --> UC3
acc --> UC_RET2
acc --> UC4
acc --> UC_PO1

UC5 <-- mgr
UC_PO2 <-- mgr
@enduml
`;

const options = {
  hostname: 'kroki.io',
  port: 443,
  path: '/plantuml/png',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(puml)
  }
};

const outputPath = path.join(__dirname, 'public', 'usecase_diagram.png');

const req = https.request(options, (res) => {
  const file = fs.createWriteStream(outputPath);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Gambar Use Case berhasil disimpan di: ' + outputPath);
  });
});

req.on('error', (e) => {
  console.error('Terjadi kesalahan saat mengunduh gambar:', e);
});

req.write(puml);
req.end();
