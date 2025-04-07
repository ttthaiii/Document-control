# ใช้ Node.js เป็น Base Image
FROM node:18-alpine

# กำหนด Working Directory
WORKDIR /app

# คัดลอก Dependencies และติดตั้ง
COPY package.json package-lock.json ./
RUN npm install --production

# คัดลอกโค้ดทั้งหมด
COPY . .

# เปิดพอร์ต 3000
EXPOSE 3000

# รันเซิร์ฟเวอร์
CMD ["node", "Server.js"]
