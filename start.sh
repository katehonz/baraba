#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Стартиране на приложението..."

# Спиране на съществуващи процеси
./stop.sh 2>/dev/null

# Проверка дали backend binary съществува
if [ ! -f "./bin/baraba" ]; then
    echo "Компилиране на backend..."
    nim c -d:release --threads:on -d:ssl -o:bin/baraba src/baraba.nim
fi

# Стартиране на backend
echo "Стартиране на backend (порт 5000)..."
./bin/baraba &
BACKEND_PID=$!

# Изчакване backend да стартира
sleep 2

# Стартиране на frontend
echo "Стартиране на frontend (порт 5173)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "Приложението е стартирано:"
echo "  Backend:  http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "За спиране: ./stop.sh"
