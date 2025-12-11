terraform {
  required_version = ">= 1.2.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Some global services (e.g., CloudFront WAF) must be managed from us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
