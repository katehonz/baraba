# Troubleshooting Guide

Този документ съдържа решения за често срещани проблеми при разработка и deployment на Baraba.

---

## Installation & Setup Issues

### 1. Nim Installation Problems

#### Problem: `choosenim` installation fails
```bash
Error: Could not download Nim
```

**Solution:**
```bash
# Инсталирай ръчно
wget https://nim-lang.org/download/nim-2.2.4-linux_x64.tar.gz
tar -xzf nim-2.2.4-linux_x64.tar.gz
cd nim-2.2.4
sh install.sh /usr/local

# Добави към PATH
echo 'export PATH=/usr/local/nim/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Problem: Compiler не намира модули
```bash
Error: Cannot open file: vendor/nim-graphql/graphql.nim
```

**Solution:**
```bash
# Провери пътищата в compilation командата
nim c -d:ssl \
  -p:src/vendor \
  -p:src/vendor/nim-jwt/src \
  -p:src/vendor/tinypool/src \
  -p:src/vendor/nim-graphql \
  -o:bin/baraba \
  src/baraba.nim

# Или използвай config.nims файл
echo 'switch("path", "src/vendor")' >> config.nims
echo 'switch("path", "src/vendor/nim-graphql")' >> config.nims
```

### 2. PostgreSQL Connection Issues

#### Problem: `Connection refused`
```bash
Error: Database select query failed: connection to server at "localhost"
```

**Solution:**
```bash
# 1. Провери дали PostgreSQL работи
sudo systemctl status postgresql

# 2. Ако не работи, стартирай го
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Провери pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Добави:
# local   all             all                                     md5
# host    all             all             127.0.0.1/32            md5

# 4. Рестартирай PostgreSQL
sudo systemctl restart postgresql

# 5. Тествай връзката
PGPASSWORD='your_password' psql -h localhost -U postgres -d jesterac -c '\conninfo'
```

#### Problem: `FATAL: database "jesterac" does not exist`
```bash
# Създай базата данни
sudo -u postgres createdb jesterac

# Или с psql
sudo -u postgres psql
CREATE DATABASE jesterac;
\q
```

#### Problem: `FATAL: password authentication failed for user "postgres"`
```bash
# Смени паролата на postgres
sudo -u postgres psql
ALTER USER postgres PASSWORD 'new_password';
\q

# Обнови config.nim с новата парола
nano src/db/config.nim
```

### 3. Frontend Build Issues

#### Problem: `npm install` fails with permissions error
```bash
# Използвай nvm вместо системен Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Или поправи permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

#### Problem: Vite build fails
```bash
Error: Build failed with 1 error:
Failed to resolve import "react-router-dom"
```

**Solution:**
```bash
# Изчисти node_modules и преинсталирай
cd frontend
rm -rf node_modules package-lock.json
npm install

# Провери dependencies в package.json
npm install react-router-dom@latest
```

---

## Runtime Issues

### 1. Backend Crashes

#### Problem: SIGSEGV (Illegal storage access)
```bash
./baraba
SIGSEGV: Illegal storage access
```

**Solution:**
```bash
# Компилирай с --threads:off
nim c -d:release --threads:off \
  -p:src/vendor \
  -p:src/vendor/nim-jwt/src \
  -p:src/vendor/tinypool/src \
  -p:src/vendor/nim-graphql \
  -o:bin/baraba \
  src/baraba.nim

# Ако продължава, използвай --debug за трасиране
nim c -d:debug --threads:off \
  # ... останалата команда
gdb ./bin/baraba
(gdb) run
(gdb) bt  # backtrace
```

#### Problem: Database query fails with "column does not exist"
```bash
Error: Database select query failed: column "createdAt" does not exist
```

**Solution:**
```bash
# Провери колоните в базата
PGPASSWORD='password' psql -h localhost -U postgres -d jesterac -c "\d users"

# Ако колоните са camelCase вместо snake_case:
# Drop всички таблици и пре migriрай
PGPASSWORD='password' psql -h localhost -U postgres -d jesterac << EOF
DROP TABLE IF EXISTS "EntryLine" CASCADE;
DROP TABLE IF EXISTS "JournalEntry" CASCADE;
DROP TABLE IF EXISTS "Counterpart" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "Company" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "UserGroup" CASCADE;
DROP TABLE IF EXISTS "Currency" CASCADE;
DROP TABLE IF EXISTS "VatRate" CASCADE;
DROP TABLE IF EXISTS "ExchangeRate" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "FixedAssetCategory" CASCADE;
EOF

# Пре migрирай
./bin/migrate
```

### 2. Frontend Issues

#### Problem: CORS errors в browser
```bash
Access to fetch at 'http://localhost:5000/api/auth/login' 
has been blocked by CORS policy
```

**Solution:**
```bash
# Провери дали backend работи
curl http://localhost:5000/health

# Провери Jester CORS headers
curl -I http://localhost:5000/api/companies
# Трябва да виждаш:
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS

# Ако липсват, добави CORS middleware в baraba.nim
import std/[httpcore, strutils]

# Преди routes:
proc setCorsHeaders(req: Request): Response =
  var headers = newHttpHeaders([
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"),
    ("Access-Control-Allow-Headers", "Content-Type, Authorization")
  ])
  return newResponse(Http200, headers, "")
```

#### Problem: API calls fail with 401 Unauthorized
```bash
# Провери дали token се изпраща
localStorage.getItem('token')  # в browser console

# Провери token validity
curl -H "Authorization: Bearer $(localStorage.getItem('token'))" \
  http://localhost:5000/api/auth/me

# Ако token-а е изтекъл, refresh-ни го или login-ай отново
```

### 3. Performance Issues

#### Problem: Slow database queries
```bash
# 1. Намери бавните заявки
sudo -u postgres psql jesterac -c "
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# 2. Добави индекси
sudo -u postgres psql jesterac -c "
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_id 
ON journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_document_date 
ON journal_entries(document_date);
CREATE INDEX IF NOT EXISTS idx_entry_lines_journal_entry_id 
ON entry_lines(journal_entry_id);"

# 3. Анализирай таблиците
sudo -u postgres psql jesterac -c "ANALYZE;"
```

#### Problem: Frontend bundle е твърде голям
```bash
# Анализирай bundle-а
cd frontend
npm run build

# Използвай webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer
npx webpack-bundle-analyzer dist/stats.json

# Оптимизации:
# 1. Dynamic imports за големи компоненти
const LazyComponent = React.lazy(() => import('./LargeComponent'));

# 2. Tree shaking за unused imports
# 3. Code splitting по маршрути
# 4. Compression в Nginx
```

---

## Development Issues

### 1. Git Issues

#### Problem: Merge conflicts
```bash
# 1. Отмени merge ако е нужно
git merge --abort

# 2. Update локалния branch
git fetch origin
git rebase origin/main

# 3. Разреши конфликтите ръчно
git status
# edit файлите
git add .
git rebase --continue
```

#### Problem: Git submodule issues
```bash
# Инициализирай submodules
git submodule update --init --recursive

# Update submodules
git submodule update --remote

# Ако submodule е broken
git submodule deinit vendor/nim-graphql
rm -rf vendor/nim-graphql
git submodule add https://github.com/status-im/nim-graphql.git vendor/nim-graphql
```

### 2. Testing Issues

#### Problem: Tests fail с database errors
```bash
# Setup test database
sudo -u postgres createdb jesterac_test

# Използвай environment variables
export TEST_DB_HOST=localhost
export TEST_DB_USER=postgres
export TEST_DB_PASSWORD=test
export TEST_DB_NAME=jesterac_test

# Run tests с test database
nim c -r tests/test_user_service.nim
```

#### Problem: Frontend tests fail с timeout
```typescript
// Увеличи timeout за асинхронни операции
import { waitFor } from '@testing-library/react';

// Вместо:
// expect(screen.getByText('Loaded')).toBeInTheDocument();

// Използвай:
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, { timeout: 5000 });
```

---

## Production Issues

### 1. Service Management

#### Problem: systemd service fails to start
```bash
# Провери service status
sudo systemctl status baraba

# Провери логовете
sudo journalctl -u baraba -f

# Провери permissions
ls -la /var/www/baraba/bin/baraba
# Трябва да е изпълним и с правилни permissions:
sudo chmod +x /var/www/baraba/bin/baraba
sudo chown baraba:baraba /var/www/baraba/bin/baraba

# Провери systemd service configuration
sudo nano /etc/systemd/system/baraba.service
# Увери се, че WorkingDirectory и User са правилни
```

#### Problem: Nginx 502 Bad Gateway
```bash
# 1. Провери дали backend работи
curl http://localhost:5000/health

# 2. Провери Nginx logs
sudo tail -f /var/log/nginx/error.log

# 3. Провери Nginx configuration
sudo nginx -t

# 4. Рестартирай Nginx
sudo systemctl restart nginx

# 5. Провери firewall
sudo ufw status
sudo ufw allow 'Nginx Full'
```

### 2. SSL Certificate Issues

#### Problem: Let's Encrypt certificate renewal fails
```bash
# 1. Ръчно renewal
sudo certbot renew --dry-run

# 2. Провери domain DNS
dig your-domain.com

# 3. Провери Nginx configuration за domain
grep server_name /etc/nginx/sites-available/baraba

# 4. Провери firewall за port 80/443
sudo ufw status

# 5. Ако всичко друго се провали, reinstall certbot
sudo apt remove certbot python3-certbot-nginx
sudo apt install certbot python3-certbot-nginx
```

### 3. Database Performance

#### Problem: High memory usage
```bash
# 1. Провери PostgreSQL memory settings
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"

# 2. Провери active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Провери connection pooling
sudo -u postgres psql -c "SHOW max_connections;"

# 4. Оптимизирай queries
sudo -u postgres psql -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE calls > 100 
ORDER BY mean_time DESC 
LIMIT 10;"
```

---

## Debugging Tools

### 1. Backend Debugging

#### Стъпки за debug на Nim:
```bash
# 1. Компилирай с debug info
nim c -d:debug --debuginfo --lineDir:on src/baraba.nim

# 2. Използвай gdb
gdb ./baraba
(gdb) set environment PGHOST=localhost
(gdb) run
(gdb) bt  # backtrace when crashes
(gdb) p variable_name  # print variable

# 3. Добави debug logging
import std/[strutils, times]

proc debugLog(msg: string) =
  echo "[DEBUG " & now().format("HH:mm:ss") & "] " & msg

debugLog("Starting database query")
# ... code
debugLog("Database query completed")
```

#### Memory leak detection:
```bash
# Използвай valgrind
valgrind --leak-check=full --show-leak-kinds=all ./baraba
```

### 2. Frontend Debugging

#### Chrome DevTools:
```javascript
// 1. Performance profiling
// Performance tab -> Record -> Actions -> Stop recording

// 2. Memory profiling
// Memory tab -> Take snapshot -> Perform actions -> Take snapshot -> Compare

// 3. Network debugging
// Network tab -> Clear -> Perform action -> Check requests
// Filter by XHR или Fetch

// 4. Console debugging
localStorage.clear()
sessionStorage.clear()

// Debug React components
import React from 'react';
window.React = React; // В browser console: React.version

// Debug Redux/React Query
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Add to App.tsx: <ReactQueryDevtools initialIsOpen={false} />
```

---

## Monitoring & Logging

### 1. Application Logs
```bash
# Backend logs
sudo journalctl -u baraba -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/15/main/postgresql.log
```

### 2. Performance Monitoring
```bash
# System resources
htop          # CPU и memory
iotop         # Disk I/O
iftop         # Network

# Database performance
sudo -u postgres psql -c "
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  tup_returned,
  tup_fetched,
  tup_inserted,
  tup_updated,
  tup_deleted
FROM pg_stat_database;"

# Application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5000/api/companies
```

### 3. Health Checks
```bash
# Използвай Healthcheck script
#!/bin/bash
# health_check.sh

# Backend health
backend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ $backend_response != "200" ]; then
    echo "❌ Backend health check failed: $backend_response"
    exit 1
fi

# Database health
db_response=$(PGPASSWORD='password' psql -h localhost -U postgres -d jesterac -c "SELECT 1;" -t -A)
if [ "$db_response" != "1" ]; then
    echo "❌ Database health check failed"
    exit 1
fi

# Frontend health
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)
if [ $frontend_response != "200" ]; then
    echo "❌ Frontend health check failed: $frontend_response"
    exit 1
fi

echo "✅ All services healthy"
```

---

## Emergency Procedures

### 1. Database Corruption
```bash
# 1. Спрете приложението
sudo systemctl stop baraba

# 2. Backup на current state
sudo -u postgres pg_dump jesterac > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Възстановете от най-новия backup
sudo -u postgres psql jesterac < /var/backups/baraba/db_latest.sql.gz

# 4. Провери data integrity
sudo -u postgres psql jesterac -c "SELECT COUNT(*) FROM users;"
sudo -u postgres psql jesterac -c "SELECT COUNT(*) FROM journal_entries;"

# 5. Рестартирай приложението
sudo systemctl start baraba
```

### 2. Security Incident
```bash
# 1. Изолирай сървъра
sudo ufw deny all
sudo ufw allow from your_ip to any port 22

# 2. Прегледай access логовете
sudo grep "POST /api/auth/login" /var/log/nginx/access.log | tail -100

# 3. Промени пароли
sudo -u postgres psql -c "ALTER USER baraba_user PASSWORD 'new_secure_password';"

# 4. Регенерирай JWT secret
# Обнови src/services/auth.nim с нов secret
# Рекомпилирай и рестартирай

# 5. Налоги всички потребители да сменят паролите си
```

### 3. Rollback Procedure
```bash
# 1. Backup на current version
sudo cp /var/www/baraba/bin/baraba /var/backups/baraba/baraba.backup.$(date +%Y%m%d_%H%M%S)

# 2. Checkout на previous tag
cd /var/www/baraba
git fetch --tags
git checkout v1.0.1  # previous stable version

# 3. Rebuild
nim c -d:release --threads:off -p:src/vendor -p:src/vendor/nim-jwt/src -p:src/vendor/tinypool/src -p:src/vendor/nim-graphql -o:bin/baraba src/baraba.nim

# 4. Restore database ако е нужно
sudo -u postgres psql jesterac < /var/backups/baraba/db_backup_before_rollback.sql

# 5. Рестартирай
sudo systemctl restart baraba
```

---

## Contact & Support

### Ако проблемът продължава:
1. **Check documentation** - Прегледай всички документи в `/docs/`
2. **Search issues** - Провери GitLab issues за similar problems
3. **Check logs** - Събери релевантни логове преди да поискаш помощ
4. **Provide details** - Още детайли = бързо решение

### Report а issue:
```markdown
## Environment
- OS: Ubuntu 22.04
- Nim: 2.2.4
- Node.js: 20.10.0
- PostgreSQL: 15

## Problem
[Detailed description of the issue]

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Logs
[Relevant log files]

## Additional Context
[Any other relevant information]
```

Този troubleshooting guide ще се обновява редовно с нови проблеми и решения.