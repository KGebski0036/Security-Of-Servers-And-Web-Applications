resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true
  tags                 = { Project = var.project_name }
}

# 1. Security Group for App Runner (Allows it to talk to things inside VPC)
resource "aws_security_group" "apprunner_sg" {
  name        = "${var.project_name}-apprunner-sg"
  description = "Security group for App Runner VPC Connector"
  vpc_id      = module.vpc.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project_name}-apprunner-sg" }
}

# 2. VPC Connector (The "Bridge" between App Runner and your VPC)
resource "aws_apprunner_vpc_connector" "connector" {
  vpc_connector_name = "${var.project_name}-vpc-connector"
  subnets            = module.vpc.private_subnets
  security_groups    = [aws_security_group.apprunner_sg.id]
}

resource "aws_iam_role" "apprunner_access_role" {
  name = "${var.project_name}-apprunner-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { Service = "build.apprunner.amazonaws.com" }
        Action    = "sts:AssumeRole"
      },
      {
        Effect    = "Allow"
        Principal = { Service = "tasks.apprunner.amazonaws.com" }
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "apprunner_policy" {
  name = "${var.project_name}-apprunner-policy"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ],
        Resource = "*"
      },
      {
        Effect = "Allow",
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ],
        Resource = [
          aws_secretsmanager_secret.db_password.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_attach" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = aws_iam_policy.apprunner_policy.arn
}

# App Runner service
resource "aws_apprunner_service" "backend" {
  service_name = "${var.project_name}-backend"

  instance_configuration {
    instance_role_arn = aws_iam_role.apprunner_access_role.arn
    cpu    = "1024" # 1 vCPU (Example values, adjust if needed)
    memory = "2048" # 2 GB (Example values, adjust if needed)
  }

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "8000"
        runtime_environment_variables = {
          # Use the variable from previous fix (db_instance_address)
          DB_HOST        = module.db.db_instance_address
          DB_PORT        = module.db.db_instance_port
          DB_NAME        = var.db_name
          DB_USER        = var.db_username
          PGSSLMODE      = "require"
          # CORS: Add CloudFront domain to allowed origins
          # This allows the frontend hosted on CloudFront to make API requests
          CORS_ALLOWED_ORIGINS = "https://${module.cloudfront.cloudfront_distribution_domain_name}"
          # ALLOWED_HOSTS: Allow all hosts (security handled by CORS)
          # App Runner service URL will be automatically included
          ALLOWED_HOSTS = "*"
          # BASE_URL: Used for generating absolute URLs for media files
          # App Runner service URL with HTTPS (will be set after service creation)
          # Note: This is a self-reference that will be updated after the service is created
          USE_TLS = "True"
          # Service name exposed by the /api/whoami endpoint to show load balancing
          APP_RUNNER_SERVICE_NAME = "${var.project_name}-backend"
        }
        runtime_environment_secrets = {
          DB_PASSWORD = aws_secretsmanager_secret.db_password.arn
        }
      }
    }
  }

  # 3. Attach the VPC Connector here
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.connector.arn
    }
  }

  tags = { Project = var.project_name }

  depends_on = [module.cloudfront]
}
