# คู่มือตั้งค่า Firebase Realtime Database

## ปัญหา: PERMISSION_DENIED

ถ้าคุณเห็น error "PERMISSION_DENIED: Permission denied" แสดงว่า Firebase Realtime Database ยังไม่ได้ตั้งค่า Security Rules

## วิธีแก้ไข

### ขั้นตอนที่ 1: เข้าสู่ Firebase Console
1. ไปที่ https://console.firebase.google.com
2. เลือกโปรเจ็กต์ **battleship-3e8fb**

### ขั้นตอนที่ 2: ตั้งค่า Realtime Database Rules
1. ไปที่เมนูด้านซ้าย → **Build** → **Realtime Database**
2. คลิกแท็บ **Rules** ด้านบน
3. คัดลอกและวาง code ด้านล่างนี้:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

4. คลิกปุ่ม **Publish** สีน้ำเงิน

### ขั้นตอนที่ 3: ทดสอบ
1. กลับมาที่เกม
2. ลองสร้างห้องใหม่อีกครั้ง
3. ควรสำเร็จแล้ว!

## หมายเหตุสำคัญ

⚠️ **Security Rules ด้านบนเหมาะสำหรับการทดสอบเท่านั้น**

สำหรับ production ที่ใช้งานจริง ควรเพิ่มการตรวจสอบสิทธิ์:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## ปัญหาอื่นๆ

### Database URL ไม่ถูกต้อง
ถ้าเห็น error เกี่ยวกับ database URL ให้ตรวจสอบว่า `lib/firebase.ts` ใช้ URL:
```
https://battleship-3e8fb-default-rtdb.asia-southeast1.firebasedatabase.app
```

### ไม่มี Realtime Database
ถ้ายังไม่ได้สร้าง Realtime Database:
1. ไปที่ **Build** → **Realtime Database**
2. คลิก **Create Database**
3. เลือก region: **asia-southeast1**
4. เลือก **Start in test mode**
5. คลิก **Enable**
