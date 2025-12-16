# Deployment Guide

## Production Deployment

Този guide описва как да разположите Baraba в production среда.

## Инфраструктурни изисквания

### Минимална конфигурация
- **CPU:** 2 cores
- **RAM:** 4GB
- **Storage:** 50GB SSD
- **OS:** Ubuntu 20.04+ / Debian 11+

### Препоръчителна конфигурация
- **CPU:** 4+ cores
- **RAM:** 8GB+
- **Storage:** 100GB+ SSD
- **OS:** Ubuntu 22.04 LTS

### Software изисквания
- **PostgreSQL:** 15+
- **Node.js:** 18+
- **Nginx:** 1.18+
- **Let's Encrypt** (за SSL)

---

## 1. Подготовка на сървъра

### 1.1 Basic setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Създай потребител за приложението
sudo useradd -m -s /bin/bash baraba
sudo usermod -aG sudo baraba

# Влез като baraba
su - baraba
```

### 1.2 Инсталирай dependencies
```bash
# PostgreSQL
sudo apt install postgresql postgresql-contrib

# Node.js (NodeSource repository)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx
sudo apt install nginx

# Други полезни инструменти
sudo apt install git curl wget certbot python3-certbot-nginx
```

### 1.3 Инсталирай Nim
```bash
# Като baraba потребител
curl https://nim-lang.org/choosenim/init.sh -sSf | sh
echo 'export PATH=~/.nimblebin:$PATH' >> ~/.bashrc
source ~/.bashrc
choosenim stable
```

---

## 2. Database Setup

### 2.1 PostgreSQL конфигурация
```bash
# Създай база данни и потребител
sudo -u postgres psql << EOF
CREATE DATABASE baraba_prod;
CREATE USER baraba_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE baraba_prod TO baraba_user;
ALTER USER baraba_user CREATEDB;
\q
EOF
```

### 2.2 PostgreSQL performance tuning
```bash
# Редактирай postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
```

Препоръчителни настройки:
```ini
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# Performance settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

```bash
# Рестартирай PostgreSQL
sudo systemctl restart postgresql
```

---

## 3. Application Deployment

### 3.1 Clone и build
```bash
# Като baraba потребител
cd /var/www
sudo mkdir -p baraba
sudo chown baraba:baraba baraba
cd baraba

# Clone от GitLab (използвай SSH)
git clone git@gitlab.com:balvatar/baraba.git .

# Build backend
nim c -d:release -d:ssl \
  -p:src/vendor \
  -p:src/vendor/nim-jwt/src \
  -p:src/vendor/tinypool/src \
  -p:src/vendor/nim-graphql \
  -o:bin/baraba \
  src/baraba.nim

# Build migrate
nim c -d:ssl \
  -p:src/vendor \
  -p:src/vendor/nim-jwt/src \
  -p:src/vendor/tinypool/src \
  -p:src/vendor/nim-graphql \
  -o:bin/migrate \
  src/db/migrate.nim

# Build frontend
cd frontend
npm install
npm run build
cd ..
```

### 3.2 Конфигурация на базата данни
```bash
# Редактирай src/db/config.nim
nano src/db/config.nim
```

```nim
const
  DbHost* = "localhost"
  DbUser* = "baraba_user"
  DbPassword* = "secure_password_here"
  DbName* = "baraba_prod"
  PoolSize* = 20
```

### 3.3 Миграция и seed
```bash
# Мигрирай базата данни
./bin/migrate
```

### 3.4 Production конфигурация
```bash
# Редактирай src/services/auth.nim
nano src/services/auth.nim
```

```nim
const
  JwtSecret* = "ваш-дълъг-сигурен-secret-ключ-поне-32-символа!"
  JwtExpirationHours* = 24
```

---

## 4. Systemd Service

### 4.1 Създай service файл
```bash
sudo nano /etc/systemd/system/baraba.service
```

```ini
[Unit]
Description=Baraba Accounting API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=baraba
Group=baraba
WorkingDirectory=/var/www/baraba
ExecStart=/var/www/baraba/bin/baraba
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/var/www/baraba
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

### 4.2 Стартирай service
```bash
sudo systemctl daemon-reload
sudo systemctl enable baraba
sudo systemctl start baraba
sudo systemctl status baraba
```

---

## 5. Nginx Configuration

### 5.1 Създай Nginx config
```bash
sudo nano /etc/nginx/sites-available/baraba
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Frontend static files
    location / {
        root /var/www/baraba/frontend/dist;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API proxy
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # GraphQL proxy
    location /graphql {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # GraphQL often needs larger body size
        client_max_body_size 10M;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
```

### 5.2 Активирай сайта
```bash
sudo ln -s /etc/nginx/sites-available/baraba /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. SSL с Let's Encrypt

### 6.1 Инсталирай SSL сертификат
```bash
# Увери се, че domain-ът сочи към сървъра
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 6.2 Auto-renewal
```bash
# Добави cron job за auto-renewal
sudo crontab -e
```

```
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 7. Monitoring и Logging

### 7.1 Log rotation
```bash
sudo nano /etc/logrotate.d/baraba
```

```
/var/log/baraba/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 baraba baraba
    postrotate
        systemctl reload baraba
    endscript
}
```

### 7.2 Monitoring scripts
```bash
# Създай health check script
sudo nano /usr/local/bin/baraba-health-check.sh
```

```bash
#!/bin/bash
# Health check за Baraba
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ $response != "200" ]; then
    echo "Baraba health check failed with status $response"
    systemctl restart baraba
    # Изпрати notification (slack/email/etc.)
fi
```

```bash
# Добави в crontab (проверка на всеки 5 минути)
*/5 * * * * /usr/local/bin/baraba-health-check.sh
```

---

## 8. Backup Strategy

### 8.1 Database backup
```bash
# Създай backup script
sudo nano /usr/local/bin/baraba-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/baraba"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="baraba_prod"

# Създай backup директория
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U baraba_user $DB_NAME | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Изтрий стари backups (запази 30 дни)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

### 8.2 File backup
```bash
# Добави към backup script
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /var/www/baraba/frontend/dist
```

### 8.3 Schedule backups
```bash
# Всеки ден в 2:00 AM
sudo crontab -e
```

```
0 2 * * * /usr/local/bin/baraba-backup.sh
```

---

## 9. Security Hardening

### 9.1 Firewall
```bash
# Разреши само необходимите портове
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 9.2 Fail2ban
```bash
sudo apt install fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
```

### 9.3 PostgreSQL security
```bash
# Ограничи достъпа до PostgreSQL
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             baraba_user                            md5

# IPv4 local connections:
host    all             baraba_user    127.0.0.1/32            md5

# IPv6 local connections:
host    all             baraba_user    ::1/128                 md5
```

---

## 10. Performance Optimization

### 10.1 PostgreSQL tuning
```bash
# Мониторинг на PostgreSQL performance
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

### 10.2 Nginx tuning
```nginx
# Добави в nginx config
http {
    # Worker processes
    worker_processes auto;
    
    # Connections
    worker_connections 1024;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    server {
        # Apply rate limiting to API
        location /api {
            limit_req zone=api burst=20 nodelay;
            # ... останалата конфигурация
        }
    }
}
```

---

## 11. Deployment Automation

### 11.1 Deployment script
```bash
# Създай deploy script
sudo nano /usr/local/bin/baraba-deploy.sh
```

```bash
#!/bin/bash
set -e

echo "Starting Baraba deployment..."

# Backup current version
cp /var/www/baraba/bin/baraba /var/backups/baraba/baraba.backup.$(date +%Y%m%d_%H%M%S)

# Pull latest changes
cd /var/www/baraba
git pull origin main

# Build new version
nim c -d:release -d:ssl \
  -p:src/vendor \
  -p:src/vendor/nim-jwt/src \
  -p:src/vendor/tinypool/src \
  -p:src/vendor/nim-graphql \
  -o:bin/baraba \
  src/baraba.nim

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Restart service
sudo systemctl reload baraba

# Health check
sleep 5
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ $response == "200" ]; then
    echo "Deployment successful!"
else
    echo "Deployment failed! Rolling back..."
    # Implement rollback logic
    exit 1
fi
```

---

## 12. Troubleshooting

### 12.1 Common issues
- **Service won't start:** Провери логовете с `journalctl -u baraba`
- **Database connection errors:** Провери PostgreSQL конфигурацията
- **Nginx 502 errors:** Провери дали backend-ът работи
- **SSL certificate issues:** Провери domain конфигурацията

### 12.2 Log locations
- **Application logs:** `journalctl -u baraba -f`
- **Nginx logs:** `/var/log/nginx/error.log`
- **PostgreSQL logs:** `/var/log/postgresql/15/main/postgresql.log`

---

## 13. Maintenance

### 13.1 Regular tasks
- **Weekly:** Провери log sizes и disk space
- **Monthly:** Обнови зависимостите (npm packages, nimble packages)
- **Quarterly:** Прегледай security advisories и обнови системата

### 13.2 Update procedure
```bash
# 1. Backup преди update
/usr/local/bin/baraba-backup.sh

# 2. Update системата
sudo apt update && sudo apt upgrade

# 3. Update dependencies
cd /var/www/baraba
npm update
choosenim update stable

# 4. Rebuild и deploy
/usr/local/bin/baraba-deploy.sh
```

---

## Environment Variables

За production е препоръчително да се използват environment variables:

```bash
# ~/.bashrc за baraba потребител
export BARABA_DB_HOST="localhost"
export BARABA_DB_USER="baraba_user"
export BARABA_DB_PASSWORD="secure_password_here"
export BARABA_DB_NAME="baraba_prod"
export BARABA_JWT_SECRET="ваш-сигурен-jwt-secret"
export BARABA_ENV="production"
```

После обнови systemd service:
```ini
[Service]
EnvironmentFile=/home/baraba/.bashrc
```

---

Този deployment guide осигурява production-ready инсталация на Baraba със сигурност, мониторинг и автоматизация.