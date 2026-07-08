#!/bin/bash
# Run this script ON THE SERVER after uploading the project files.
# Usage: bash deploy.sh

set -e

echo "==> Installing production dependencies..."
npm install --omit=dev

echo "==> Installing xlsx (needed for seeder only)..."
npm install xlsx --no-save

echo "==> Running database migrations..."
npm run db:migrate

echo "==> Running seeders (plans, ranks, plan projections from Excel)..."
npm run db:seed

echo "==> Starting PM2..."
npm run pm2:start -- --env production
pm2 save

echo "==> Done. Run 'pm2 logs equity-eyes' to check startup."
