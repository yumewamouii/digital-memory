from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from ..config import get_settings

logger = logging.getLogger(__name__)


class NotificationBackend(ABC):
    @abstractmethod
    def send_email(self, to: str, subject: str, body: str) -> None: ...

    @abstractmethod
    def send_sms(self, phone: str, text: str) -> None: ...


class LogNotificationBackend(NotificationBackend):
    """Dev backend: writes messages to application logs instead of sending."""

    def send_email(self, to: str, subject: str, body: str) -> None:
        logger.info("[notify:email] to=%s subject=%s body=%s", to, subject, body)

    def send_sms(self, phone: str, text: str) -> None:
        logger.info("[notify:sms] phone=%s text=%s", phone, text)


class SmtpNotificationBackend(NotificationBackend):
    """Placeholder for future SMTP integration."""

    def send_email(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError("SMTP backend is not configured yet")

    def send_sms(self, phone: str, text: str) -> None:
        raise NotImplementedError("SMTP backend does not send SMS")


class SmsRuNotificationBackend(NotificationBackend):
    """Placeholder for future SMS.ru integration."""

    def send_email(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError("SMS.ru backend does not send email")

    def send_sms(self, phone: str, text: str) -> None:
        raise NotImplementedError("SMS.ru backend is not configured yet")


def get_notification_backend() -> NotificationBackend:
    settings = get_settings()
    backend = (settings.notification_backend or "log").lower()
    if backend == "smtp":
        return SmtpNotificationBackend()
    if backend == "smsru":
        return SmsRuNotificationBackend()
    return LogNotificationBackend()


def send_email(to: str, subject: str, body: str) -> None:
    get_notification_backend().send_email(to, subject, body)


def send_sms(phone: str, text: str) -> None:
    get_notification_backend().send_sms(phone, text)
