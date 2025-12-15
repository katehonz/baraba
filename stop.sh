#!/bin/bash

echo "Спиране на приложението..."

# Спиране на процеси на порт 5000 (backend)
if lsof -ti:5000 > /dev/null 2>&1; then
    echo "Спиране на backend (порт 5000)..."
    kill $(lsof -ti:5000) 2>/dev/null
fi

# Спиране на процеси на порт 5173 (frontend/vite)
if lsof -ti:5173 > /dev/null 2>&1; then
    echo "Спиране на frontend (порт 5173)..."
    kill $(lsof -ti:5173) 2>/dev/null
fi

# Спиране на Docker контейнери ако има работещи
if docker ps -q | grep -q .; then
    echo "Спиране на Docker контейнери..."
    docker stop $(docker ps -q) 2>/dev/null
fi

echo "Готово."
