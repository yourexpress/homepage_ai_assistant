cd ~/Documents/homepage_ai_assistant
sudo docker stop homepage-ai-backend && sudo docker rm homepage-ai-backend
sudo docker build -t homepage-ai-backend ./backend
sudo docker run -d \
  --name homepage-ai-backend \
  -p 8000:8000 \
  --env-file backend/.env \
  --restart unless-stopped \
  homepage-ai-backend
