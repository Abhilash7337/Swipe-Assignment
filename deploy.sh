#!/bin/bash

# Swipe Application EC2 Deployment Script
echo "🚀 Starting Swipe Application Deployment..."

# Set Node.js memory options for build
export NODE_OPTIONS="--max-old-space-size=4096"

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install nginx -y

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install MongoDB (optional - if you want local MongoDB)
echo "📦 Installing MongoDB..."
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /var/www/swipe-app
cd /var/www/swipe-app

# Clone your repository (replace with your actual repo URL)
echo "📥 Cloning repository..."
# sudo git clone https://github.com/Abhilash7337/Swipe-Assignment.git .

# Note: You'll need to manually upload your code or clone from your repo
echo "⚠️  Please upload your application code to /var/www/swipe-app"
echo "⚠️  Or clone from your repository: git clone <your-repo-url> ."

# Setup backend
echo "🔧 Setting up backend..."
cd backend
sudo npm install

# Copy environment file
sudo cp .env.production .env
echo "⚠️  Please edit /var/www/swipe-app/backend/.env with your actual values"

# Setup frontend
echo "🔧 Setting up frontend..."
cd ../frontend
sudo npm install

# Copy environment file
sudo cp .env.production .env
echo "⚠️  Please edit /var/www/swipe-app/frontend/.env with your actual values"

# Build frontend
echo "🏗️  Building frontend..."
sudo npm run build

# Copy built files to nginx directory
echo "📂 Copying frontend files to nginx directory..."
sudo mkdir -p /var/www/html
sudo cp -r dist/* /var/www/html/

# Setup nginx configuration
echo "🔧 Setting up Nginx configuration..."
sudo cp ../nginx.conf /etc/nginx/nginx.conf

# Test nginx configuration
sudo nginx -t

# Start services
echo "🚀 Starting services..."

# Start backend with PM2
cd ../backend
pm2 start server.js --name "swipe-backend"
pm2 startup
pm2 save

# Start nginx
sudo systemctl restart nginx
sudo systemctl enable nginx

# Setup firewall (optional)
echo "🔒 Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Deployment completed!"
echo ""
echo "🔧 Manual steps required:"
echo "1. Edit /var/www/swipe-app/backend/.env with your actual values"
echo "2. Edit /var/www/swipe-app/frontend/.env with your actual values"
echo "3. Update nginx.conf with your actual domain name"
echo "4. Restart services: pm2 restart swipe-backend && sudo systemctl restart nginx"
echo ""
echo "📋 Useful commands:"
echo "- Check backend logs: pm2 logs swipe-backend"
echo "- Check nginx status: sudo systemctl status nginx"
echo "- Check nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Restart backend: pm2 restart swipe-backend"
echo "- Restart nginx: sudo systemctl restart nginx"