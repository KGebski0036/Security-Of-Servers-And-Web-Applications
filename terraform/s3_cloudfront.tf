resource "random_id" "s3suffix" { byte_length = 4 }

module "frontend_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "3.15.1"

  bucket        = "${var.project_name}-frontend-${random_id.s3suffix.hex}"
  force_destroy = true

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  tags = { Project = var.project_name }
}

# Create CloudFront Origin Access Control (OAC) (recommended over old OAI)
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.project_name} S3"
  origin_access_control_origin_type = "s3"
  signing_protocol                  = "sigv4"
  signing_behavior                  = "always"
}

module "cloudfront" {
  source  = "terraform-aws-modules/cloudfront/aws"
  version = "5.0.1"

  enabled = true

  origin = {
    s3 = {
      domain_name = module.frontend_bucket.s3_bucket_bucket_regional_domain_name
      origin_id   = "s3origin"

      origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
    }
  }

  default_cache_behavior = {
    target_origin_id = "s3origin"

    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]

    use_forwarded_values = false

    cache_policy_id          = data.aws_cloudfront_cache_policy.cache_optimized.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.s3_basic.id
  }

  # Custom error responses for SPA routing
  # Return index.html for 403 and 404 errors to support client-side routing
  custom_error_response = [
    {
      error_code            = 403
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 300
    },
    {
      error_code            = 404
      response_code         = 200
      response_page_path    = "/index.html"
      error_caching_min_ttl = 300
    }
  ]

  default_root_object = "index.html"

  viewer_certificate = var.domain_name != "" && var.cloudfront_acm_arn != "" ? {
    acm_certificate_arn      = var.cloudfront_acm_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
    } : {
    cloudfront_default_certificate = true
  }

  web_acl_id = aws_wafv2_web_acl.cloudfront.arn

  tags = {
    Project = var.project_name
  }
}

# S3 Bucket Policy - Applied AFTER CloudFront is created to avoid circular dependency
resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = module.frontend_bucket.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${module.frontend_bucket.s3_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.cloudfront.cloudfront_distribution_arn
          }
        }
      }
    ]
  })

  depends_on = [module.cloudfront]
}

data "aws_cloudfront_cache_policy" "cache_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "s3_basic" {
  name = "Managed-CORS-S3Origin"
}
