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

# WAF / CloudFront protection
variable "waf_rate_limit" {
  description = "Requests per 5 minutes per IP for rate-based rule"
  type        = number
  default     = 20000
}

variable "waf_ip_allow_list" {
  description = "Optional IPv4 CIDRs to explicitly allow (CloudFront scope)"
  type        = list(string)
  default     = []
}

variable "waf_ip_block_list" {
  description = "Optional IPv4 CIDRs to explicitly block (CloudFront scope)"
  type        = list(string)
  default     = []
}

variable "waf_enable_bot_control" {
  description = "Toggle AWSManagedRulesBotControlRuleSet"
  type        = bool
  default     = true
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
