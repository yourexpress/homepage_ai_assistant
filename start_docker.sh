sudo docker run -d \
  --name homepage-ai-backend \
  -p 8000:8000 \
  --env-file backend/.env \
  --restart unless-stopped \
  homepage-ai-backend
