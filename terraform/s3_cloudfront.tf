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

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.project_name} S3"
  origin_access_control_origin_type = "s3"
  signing_protocol                  = "sigv4"
  signing_behavior                  = "always"
}

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name    = "${var.project_name}-security-headers-policy"
  comment = "Security headers for ${var.project_name} frontend"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*; object-src 'none'; frame-ancestors 'none';"
      override                = true
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      override = true
      value    = "geolocation=(), microphone=(), camera=(), payment=(), usb=()"
    }
  }
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

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
  }

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