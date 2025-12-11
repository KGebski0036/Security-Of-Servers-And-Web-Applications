resource "random_password" "db" {
  length           = 20
  override_special = "_-"
  special          = true
}

resource "aws_secretsmanager_secret" "db_password" {
  name                    = "${var.project_name}-db-password-plain"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db.result
}
