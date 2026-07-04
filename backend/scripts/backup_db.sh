#!/bin/bash
cp /opt/hermes/bungalovresepsiyonist54/data/bungalov.db /opt/hermes/bungalovresepsiyonist54/data/backups/bungalov_$(date +%Y%m%d_%H%M%S).db
echo "Backup created"
