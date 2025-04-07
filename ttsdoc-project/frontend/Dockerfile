# ใช้ Node.js เป็น Base Image สำหรับ Build
FROM node:18-alpine AS build

# กำหนด Working Directory
WORKDIR /app

# รับค่า API URL จาก build args
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# คัดลอกไฟล์ package.json และ package-lock.json ก่อน
COPY package.json package-lock.json ./

# ติดตั้ง dependencies ทั้งหมด (รวม devDependencies เพื่อใช้ในการ build)
RUN npm install

# คัดลอกโค้ดทั้งหมด
COPY . .

# แสดงค่า API URL เพื่อตรวจสอบความถูกต้อง
RUN echo "Building with REACT_APP_API_URL=${REACT_APP_API_URL}"

# Build แอปพลิเคชัน
RUN npm run build

# สร้าง production image ด้วย Nginx
FROM nginx:alpine

# คัดลอกไฟล์ที่ build แล้วไปยัง Nginx
COPY --from=build /app/build /usr/share/nginx/html

# expose พอร์ต 80
EXPOSE 80

# รัน Nginx
CMD ["nginx", "-g", "daemon off;"]