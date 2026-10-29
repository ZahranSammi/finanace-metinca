const https = require('https');
const fs = require('fs');
const path = require('path');

const puml = `
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor white
  BorderColor black
}

actor "Staff Sales" as sales
actor "Staff Accounting" as acc
actor "Manager Accounting" as mgr

rectangle "Use Case Usulan Perekapan Penjualan & Akuntansi" {
  usecase "Login" as login
  
  usecase "Menginput & Mengirim Invoice" as uc1
  usecase "Menandai Invoice Lunas" as uc2
  usecase "Mengajukan Retur / Barang Reject" as uc_ret1
  usecase "Membuat & Mengajukan Purchase Order (PO)" as uc_po1
  
  usecase "Memvalidasi / Menolak Invoice" as uc3
  usecase "Menyetujui / Menolak Retur Barang" as uc_ret2
  usecase "Membuat & Mengirim Laporan Detail & Neraca" as uc4
  
  usecase "Meninjau & Memvalidasi Laporan Detail & Neraca" as uc5
  usecase "Menyetujui / Menolak Purchase Order (PO)" as uc_po2
  
  usecase "Logout" as logout

  uc1 ..> login : <<include>>
  uc2 ..> login : <<include>>
  uc_ret1 ..> login : <<include>>
  uc_po1 ..> login : <<include>>
  uc3 ..> login : <<include>>
  uc_ret2 ..> login : <<include>>
  uc4 ..> login : <<include>>
  uc5 ..> login : <<include>>
  uc_po2 ..> login : <<include>>
  logout ..> login : <<include>>
}

sales --> uc1
sales --> uc2
sales --> uc_ret1
sales --> uc_po1
sales --> logout

acc --> uc3
acc --> uc_ret2
acc --> uc4
acc --> uc_po1
acc --> logout

mgr --> uc5
mgr --> uc_po2
mgr --> logout

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

const outputPath = path.join(__dirname, 'public', 'usecase_diagram_2.png');

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
