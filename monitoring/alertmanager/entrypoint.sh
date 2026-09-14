#!/bin/sh
set -e

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
  sed -e "s|__TELEGRAM_BOT_TOKEN__|$TELEGRAM_BOT_TOKEN|" \
      -e "s|__TELEGRAM_CHAT_ID__|$TELEGRAM_CHAT_ID|" \
      /etc/alertmanager/alertmanager.telegram.yml.template > /tmp/alertmanager.yml
  echo "alertmanager: Telegram receiver configured."
else
  cp /etc/alertmanager/alertmanager.yml /tmp/alertmanager.yml
  echo "alertmanager: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID not set in monitoring/.env — alerts fire but are not delivered anywhere until you set them."
fi

exec alertmanager --config.file=/tmp/alertmanager.yml --storage.path=/alertmanager
