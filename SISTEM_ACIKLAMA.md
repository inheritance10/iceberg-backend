# Sistem Açıklama Dökümanı

## 📋 Sistem Genel Bakış

Emlak danışmanlık şirketi için bir **işlem takip ve komisyon dağıtım sistemi**. Bir mülkün satış/kiralama sürecini takip eder ve komisyonu otomatik dağıtır.

---

## 1. 🧑 Agent (Acente) - Kimler Çalışıyor?

### Ne İşe Yarar?
- Sistemdeki emlak acentelerini temsil eder
- Her acentenin bilgileri saklanır

### Ne Tutuyor?
```typescript
Agent {
  name: "Ahmet Yılmaz",      // Acente adı
  email: "ahmet@example.com", // Email (unique)
  phone: "05551234567"        // Telefon
}
```

### Neden Var?
- Transaction'larda "listing agent" ve "selling agent" olarak kullanılır
- Komisyon dağıtımında kimin ne kadar alacağını belirler

---

## 2. 📝 Transaction (İşlem) - Ana Kalp

### Ne İşe Yarar?
- Bir mülkün satış/kiralama sürecini **baştan sona** takip eder
- İşlemin hangi aşamada olduğunu tutar
- Komisyon hesaplaması için gerekli bilgileri içerir

### Ne Tutuyor?
```typescript
Transaction {
  // Temel Bilgiler
  propertyId: "prop-123",           // Hangi mülk?
  propertyType: "sale" | "rental",  // Satış mı kiralama mı?
  totalServiceFee: 10000,           // Toplam hizmet ücreti (komisyon)
  
  // Acenteler
  listingAgentId: ObjectId,         // Mülkü listeleyen acente
  sellingAgentId: ObjectId,          // Mülkü satan acente
  
  // İşlem Aşaması
  currentStage: "agreement" | "earnest_money" | "title_deed" | "completed",
  
  // Aşama Geçmişi (Her değişiklik kaydedilir)
  stageHistory: [
    {
      stage: "agreement",
      timestamp: "2024-01-01",
      notes: "Anlaşma yapıldı"
    },
    {
      stage: "earnest_money",
      timestamp: "2024-01-05",
      notes: "Kapora ödendi"
    }
  ],
  
  // Komisyon Dağılımı (İşlem completed olduğunda hesaplanır)
  commissionBreakdown: {
    agencyAmount: 5000,              // Şirketin payı (%50)
    agents: [
      {
        agentId: ObjectId,
        amount: 5000,                // Acentenin payı
        role: "BOTH",                // Hem listing hem selling
        percentage: 50               // Toplamın %50'si
      }
    ],
    calculatedAt: "2024-01-10"
  }
}
```

### Neden Var?
- İşlem yaşam döngüsünü takip eder
- Komisyon hesaplaması için gerekli verileri tutar
- Her aşama değişikliği kaydedilir (traceability)

---

## 3. 💰 Commission (Komisyon) - Para Dağıtımı

### Ne İşe Yarar?
- İşlem tamamlandığında komisyonu **otomatik hesaplar**
- Şirket ve acenteler arasında dağıtım yapar

### Nasıl Çalışır?

#### Kural 1: Genel Dağıtım
- **Toplam hizmet ücretinin %50'si** → Şirket (Agency)
- **Kalan %50'si** → Acenteler

#### Senaryo 1: Aynı Acente (listing = selling)
```
Toplam: 10,000 TL
├─ Şirket: 5,000 TL (%50)
└─ Acente: 5,000 TL (%50) ← Tek acente alır
```

#### Senaryo 2: Farklı Acenteler
```
Toplam: 10,000 TL
├─ Şirket: 5,000 TL (%50)
└─ Acenteler:
   ├─ Listing Agent: 2,500 TL (%25)
   └─ Selling Agent: 2,500 TL (%25)
```

### CommissionBreakdown Yapısı
```typescript
commissionBreakdown: {
  agencyAmount: 5000,        // Şirket kazancı
  agents: [
    {
      agentId: "agent1",
      amount: 5000,          // Bu acente ne kadar aldı
      role: "BOTH",          // Neden aldı? (listing/selling/both)
      percentage: 50         // Toplamın yüzde kaçı
    }
  ],
  calculatedAt: Date         // Ne zaman hesaplandı
}
```

---

## 4. 🏗️ Entity'lerin Rolleri

### Agent Entity
- Acenteleri MongoDB'de saklar
- Transaction'larda referans olarak kullanılır

### Transaction Entity
- Ana işlem verilerini tutar
- İçinde nested schema'lar vardır

### StageHistory Entity (Nested)
- Her aşama değişikliğini kaydeder
- Transaction içinde array olarak tutulur
- **Traceability** sağlar

### CommissionBreakdown Entity (Nested)
- Hesaplanan komisyon dağılımını tutar
- Transaction içinde tek bir obje olarak tutulur
- İşlem tamamlandığında hesaplanır ve kaydedilir

### AgentCommission Entity (Nested)
- CommissionBreakdown içinde agents array'inde kullanılır
- Her acentenin komisyon detayını tutar

---

## 5. 🔄 Sistem Akışı

```
1. Agent Oluştur
   └─> Acenteler sisteme eklenir

2. Transaction Oluştur
   ├─> propertyId, propertyType, totalServiceFee
   ├─> listingAgentId, sellingAgentId
   └─> currentStage: "agreement" (başlangıç)

3. Stage Güncelle
   ├─> "agreement" → "earnest_money"
   ├─> "earnest_money" → "title_deed"
   └─> "title_deed" → "completed"
   └─> Her değişiklik stageHistory'ye eklenir

4. İşlem Completed Olduğunda
   └─> Commission Service devreye girer
       ├─> Komisyon hesaplanır
       ├─> commissionBreakdown oluşturulur
       └─> Transaction'a kaydedilir

5. Komisyon Sorgula
   └─> GET /transactions/:id/commission
       └─> commissionBreakdown döner
```

---

## 6. 📊 Özet: Ne Tutuyoruz?

| Entity | Ne Tutuyor? | Neden? |
|--------|-------------|--------|
| **Agent** | Acente bilgileri (isim, email, telefon) | Kimler çalışıyor? |
| **Transaction** | İşlem bilgileri (mülk, acenteler, aşama, komisyon) | Hangi işlemler var? |
| **StageHistory** | Aşama geçmişi (her değişiklik) | İşlem ne zaman hangi aşamadaydı? |
| **CommissionBreakdown** | Komisyon dağılımı (şirket + acenteler) | Kim ne kadar aldı? |
| **AgentCommission** | Her acentenin komisyon detayı | Bu acente neden ne kadar aldı? |

---

## 7. 🏠 Gerçek Hayat Örneği

**Senaryo:**
- Mülk: "İstanbul Kadıköy'de 3+1 daire"
- Toplam komisyon: 20,000 TL
- Listing Agent: Ahmet
- Selling Agent: Ahmet (aynı kişi)

**Sistem Ne Yapar?**
1. Transaction oluşturulur (stage: "agreement")
2. Aşamalar ilerler (earnest_money → title_deed → completed)
3. Completed olduğunda komisyon hesaplanır:
   - Şirket: 10,000 TL
   - Ahmet: 10,000 TL (hem listing hem selling)
4. Sonuç transaction'a kaydedilir
5. API'den sorgulanabilir: "Bu işlemde kim ne kadar aldı?"

---

## 8. ✅ Sonuç

- **Agent**: Çalışanlar
- **Transaction**: İşlemler ve süreç takibi
- **Commission**: Otomatik para dağıtımı
- **Entity'ler**: Verileri MongoDB'de saklamak için

Sistem, işlemleri takip eder ve komisyonu otomatik hesaplayıp dağıtır.

---

## 9. 🔗 İlişkiler

```
Agent (1) ──────┐
                │
                ├──> Transaction (N) ──> CommissionBreakdown
                │
Agent (1) ──────┘
```

- Bir Transaction'da 2 Agent var (listing + selling)
- Bir Transaction'da 1 CommissionBreakdown var (completed olduğunda)
- Bir CommissionBreakdown'da N AgentCommission var (kaç acente varsa)

---

## 10. 📌 Önemli Notlar

1. **Stage Geçişleri**: İşlem sadece ileriye doğru ilerler (agreement → completed)
2. **Komisyon Hesaplama**: Sadece `completed` stage'inde yapılır
3. **Traceability**: Her stage değişikliği `stageHistory`'de kayıtlı
4. **Validation**: DTO'lar ile gelen veriler doğrulanır
5. **Type Safety**: Interface'ler ile tip güvenliği sağlanır

---

Bu döküman, sistemin genel yapısını ve bileşenlerinin rollerini açıklamaktadır.

