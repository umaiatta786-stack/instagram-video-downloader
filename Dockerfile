FROM node:20-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip ca-certificates ffmpeg \
 && pip3 install --break-system-packages --no-cache-dir -U yt-dlp \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
