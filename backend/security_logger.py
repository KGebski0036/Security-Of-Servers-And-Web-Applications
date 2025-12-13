import logging
import os


log_dir = "/app/logs"
os.makedirs(log_dir, exist_ok=True)


security_logger = logging.getLogger("security")
security_logger.setLevel(logging.WARNING)


handler = logging.FileHandler(os.path.join(log_dir, "security.log"))
handler.setLevel(logging.WARNING)

formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
handler.setFormatter(formatter)

security_logger.addHandler(handler)
