#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Стартиране на приложението..."

# Зареждане на .env файл ако съществува
if [ -f ".env" ]; then
    echo "Зареждане на .env файл..."
    export $(grep -v '^#' .env | xargs)
fi

# Проверка на задължителни променливи
if [ -z "$DB_PASSWORD" ]; then
    echo "ВНИМАНИЕ: DB_PASSWORD не е зададен. Опит с парола по подразбиране..."
    export DB_PASSWORD="pas+123"
fi

# Задаване на стойности по подразбиране
export DB_HOST="${DB_HOST:-localhost}"
export DB_USER="${DB_USER:-postgres}"
export DB_NAME="${DB_NAME:-jesterac}"

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

# Проверка дали backend е стартиран
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "ГРЕШКА: Backend не успя да стартира!"
    echo "Проверете логовете и настройките на базата данни."
    exit 1
fi

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
