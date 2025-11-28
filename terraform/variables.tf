variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "project_name" {
  type    = string
  default = "soundvault"
}

# Network
variable "az_count" {
  type    = number
  default = 2
}

# DB
variable "db_username" {
  type    = string
  default = "postgres"
}
variable "db_name" {
  type    = string
  default = "soundvault"
}

# CloudFront/custom domain (optional)
variable "domain_name" {
  type    = string
  default = ""
}
variable "cloudfront_acm_arn" {
  type    = string
  default = ""
}

# App Runner image tag to pull from ECR
variable "backend_image_tag" {
  type    = string
  default = "latest"
}

# Admin CIDR for DB management (replace with your IP for safety)
variable "admin_cidr" {
  type    = string
  default = "0.0.0.0/0"
}
