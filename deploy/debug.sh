#!/bin/bash

# EC2 Debugging Script
# Run this on your EC2 instance

echo "=== Container Status ==="
docker compose ps

echo -e "\n=== Testing Backend Health ==="
curl -v http://localhost:5000/api/health

echo -e "\n=== Testing ML Service Health ==="
curl -v http://localhost:5001/health

echo -e "\n=== Recent Server Logs ==="
docker compose logs --tail=50 server

echo -e "\n=== Recent Client Logs ==="
docker compose logs --tail=50 client

echo -e "\n=== Recent ML Service Logs ==="
docker compose logs --tail=20 ml-service

echo -e "\n=== MongoDB Status ==="
docker compose logs --tail=20 mongodb

echo -e "\n=== Checking Network ==="
docker network inspect raktsetu_raktsetu-network | grep -A 20 "Containers"

echo -e "\n=== Environment Variables ==="
docker compose exec server printenv | grep -E "MONGODB|JWT|ML_SERVICE"
