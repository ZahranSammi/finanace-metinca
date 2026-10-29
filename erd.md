# Entity-Relationship Diagram (ERD) - Finance Metinca

Berikut adalah visualisasi ERD dari database beserta penjelasan lengkap mengenai relasi antar tabel (Many-to-One, One-to-Many, Many-to-Many).

## 1. Visualisasi ERD (Mermaid)

```mermaid
erDiagram
    %% Entities
    users {
        bigint id PK
        string name
        string email
        string role
    }
    
    customers {
        bigint id PK
        string name
        string email
    }
    
    products {
        bigint id PK
        string code
        string name
        string category
        decimal price
    }
    
    orders {
        string id PK
        bigint customer_id FK
        bigint user_id FK
        timestamp date_raised
        string status
        decimal total_amount
    }
    
    order_items {
        bigint id PK
        string order_id FK
        bigint product_id FK
        integer quantity
        decimal price
    }
    
    invoices {
        bigint id PK
        string order_id FK
        string invoice_type
        decimal total_amount
        string status
    }
    
    branches {
        bigint id PK
        string name
    }
    
    plants {
        bigint id PK
        bigint branch_id FK
        string name
    }
    
    suppliers {
        bigint id PK
        string name
    }
    
    purchase_orders {
        bigint id PK
        string po_number
        bigint supplier_id FK
        bigint plant_id FK
        bigint created_by FK
        bigint approved_by FK
        date date
        date expected_date
        string status
        string payment_status
        decimal total_amount
    }

    manager_reports {
        bigint id PK
        string type
        date period_start
        date period_end
        json metrics_data
        string status
        bigint created_by FK
        bigint validated_by FK
    }

    app_notifications {
        bigint id PK
        bigint user_id FK
        bigint sender_id FK
        string type
        string title
        text message
        string action_url
        timestamp read_at
    }
    
    purchase_order_items {
        bigint id PK
        bigint purchase_order_id FK
        bigint product_id FK
        integer quantity
        decimal unit_price
    }
    
    return_notes {
        bigint id PK
        string order_id FK
        enum type
        string status
        decimal total_amount
    }
    
    return_note_items {
        bigint id PK
        bigint return_note_id FK
        bigint product_id FK
        integer quantity
        decimal price_per_item
    }

    %% Relationships (Sales / Penjualan)
    customers ||--o{ orders : "has (1:N)"
    users ||--o{ orders : "handles (1:N)"
    orders ||--|{ order_items : "contains (1:N)"
    products ||--o{ order_items : "is sold in (1:N)"
    orders ||--o{ invoices : "generates (1:N)"
    
    %% Relationships (Purchasing / Pembelian)
    suppliers ||--o{ purchase_orders : "receives (1:N)"
    branches ||--o{ plants : "has (1:N)"
    plants ||--o{ purchase_orders : "issues (1:N)"
    purchase_orders ||--|{ purchase_order_items : "contains (1:N)"
    products ||--o{ purchase_order_items : "is bought in (1:N)"
    
    %% Relationships (Returns / Retur)
    orders ||--o{ return_notes : "has returns (1:N)"
    return_notes ||--|{ return_note_items : "contains (1:N)"
    products ||--o{ return_note_items : "is returned in (1:N)"

    %% Relationships (Reporting & Notifications)
    users ||--o{ manager_reports : "submits / validates (1:N)"
    users ||--o{ app_notifications : "receives / sends (1:N)"
    users ||--o{ purchase_orders : "creates / approves (1:N)"

```

> [!NOTE] 
> Diagram di atas menggunakan sintaks [Mermaid.js](https://mermaid.js.org/) yang didukung oleh GitHub dan sistem Markdown modern. 

---

## 2. Penjelasan Relasi Antar Tabel

Di dalam sistem ini, mayoritas relasi adalah **One-to-Many** (1:N) dan **Many-to-One** (N:1), yang mana jika digabungkan menggunakan tabel perantara (pivot) akan membentuk relasi logis **Many-to-Many** (M:N). 

Berikut adalah detailnya:

### A. Modul Penjualan (Sales)
- **`customers` ke `orders` (One-to-Many)**
  Satu *Customer* bisa memiliki banyak *Order*, tapi satu *Order* hanya milik satu *Customer*.
- **`users` ke `orders` (One-to-Many)**
  Satu *User (Staff/Sales)* bisa menangani banyak *Order*, tapi satu *Order* ditangani oleh satu *User*.
- **`orders` ke `invoices` (One-to-Many)**
  Satu *Order* bisa menghasilkan banyak *Invoice* (misal: *Invoice DP* dan *Invoice Final*), namun satu *Invoice* hanya merujuk ke satu *Order*.
- **`orders` ke `products` (Many-to-Many)**
  Satu *Order* bisa berisi banyak barang (*Products*), dan satu *Product* bisa berada di banyak *Order*. Relasi fisik **Many-to-Many** ini dijembatani oleh tabel perantara/pivot yaitu **`order_items`**.
  - `orders` 1:N `order_items`
  - `products` 1:N `order_items`

### B. Modul Pembelian (Purchasing)
- **`branches` ke `plants` (One-to-Many)**
  Satu *Branch (Cabang)* membawahi banyak *Plant (Pabrik/Unit)*. 
- **`suppliers` ke `purchase_orders` (One-to-Many)**
  Satu *Supplier* bisa menerima banyak *Purchase Order (PO)* dari perusahaan.
- **`plants` ke `purchase_orders` (One-to-Many)**
  Satu *Plant* bisa menerbitkan banyak *Purchase Order (PO)*.
- **`purchase_orders` ke `products` (Many-to-Many)**
  Sama seperti modul *Sales*, *PO* dan produk memiliki relasi logis **Many-to-Many** yang dijembatani oleh tabel pivot **`purchase_order_items`**.
  - `purchase_orders` 1:N `purchase_order_items`
  - `products` 1:N `purchase_order_items`

### C. Modul Retur (Return Notes)
- **`orders` ke `return_notes` (One-to-Many)**
  Satu *Order* bisa mengalami beberapa kali proses retur (pembuatan *Return Note*). 
- **`return_notes` ke `products` (Many-to-Many)**
  Satu dokumen *Return Note* dapat mencakup beberapa *Product* yang diretur, dan satu produk bisa saja diretur di banyak dokumen *Return Note*. Relasi fisik **Many-to-Many** ini dijembatani oleh tabel pivot **`return_note_items`**.
  - `return_notes` 1:N `return_note_items`
  - `products` 1:N `return_note_items`

---
> [!TIP]
> Jika Anda menggunakan ORM (seperti Eloquent di Laravel), tabel-tabel perantara seperti `order_items`, `purchase_order_items`, dan `return_note_items` bisa diimplementasikan menggunakan relasi `belongsToMany` jika tidak membutuhkan model perantara, atau `hasMany` dan `belongsTo` jika Anda membuat Model khusus untuk tabel item tersebut.
