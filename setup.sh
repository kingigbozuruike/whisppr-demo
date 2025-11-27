#!/bin/bash

# Whisppr Demo - Quick Start Script

echo "🚨 Whisppr Demo - Quick Start"
echo "======================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi
echo "✓ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found."
    exit 1
fi
echo "✓ npm $(npm -v)"

echo ""
echo "======================================"
echo "STEP 1: Backend Setup"
echo "======================================"
echo ""

cd backend

# Install backend dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
    echo "✓ Backend dependencies installed"
else
    echo "✓ Backend dependencies already installed"
fi

# Check .env file
if [ ! -f ".env" ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo ""
    echo "Please create backend/.env with your configuration:"
    echo ""
    cat << 'EOF'
TEXTBELT_API_KEY=40a3b99250b28aa1ecd3ee7fb37ec7a31bdc442dIcJZydgXa4mz5YKqmKbd8PElr
DEMO_NUMBER_1=+15551234567  # ← REPLACE WITH YOUR PHONE NUMBER!
WHISPPR_API_KEY=demo-secret-key
PORT=3000
NODE_ENV=development
EOF
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✓ Configuration file found"

# Get IP address
echo ""
echo "Finding your local IP address..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
else
    # Linux
    IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$IP" ]; then
    IP="YOUR_LOCAL_IP"
    echo "⚠️  Could not detect IP address automatically"
else
    echo "✓ Your local IP: $IP"
fi

echo ""
echo "======================================"
echo "STEP 2: Mobile App Setup"
echo "======================================"
echo ""

cd ../mobile-app

# Install mobile dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing mobile app dependencies..."
    npm install
    echo "✓ Mobile app dependencies installed"
else
    echo "✓ Mobile app dependencies already installed"
fi

echo ""
echo "======================================"
echo "✅ Setup Complete!"
echo "======================================"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Edit backend/.env and add your phone number:"
echo "   DEMO_NUMBER_1=+15551234567"
echo ""
echo "2. Edit mobile-app/App.js (line 20) with your IP:"
echo "   const BACKEND_URL = 'http://$IP:3000';"
echo ""
echo "3. Start backend (Terminal 1):"
echo "   cd backend && npm start"
echo ""
echo "4. Start mobile app (Terminal 2):"
echo "   cd mobile-app && npx expo start"
echo ""
echo "5. Press 'i' for iOS or 'a' for Android"
echo ""
echo "6. Press SOS button and check your phone!"
echo ""
echo "======================================"
echo ""
echo "For help, see:"
echo "  - README.md (overview)"
echo "  - TESTING.md (detailed testing guide)"
echo "  - backend/README.md (backend docs)"
echo "  - mobile-app/SETUP.md (mobile docs)"
echo ""
