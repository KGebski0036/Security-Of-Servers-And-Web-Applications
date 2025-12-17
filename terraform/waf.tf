locals {
  waf_scope = "CLOUDFRONT"
}

resource "aws_wafv2_ip_set" "allow_list" {
  provider           = aws.us_east_1
  count              = length(var.waf_ip_allow_list) > 0 ? 1 : 0
  name               = "${var.project_name}-waf-allow"
  description        = "Allow list for ${var.project_name} (CloudFront)"
  scope              = local.waf_scope
  ip_address_version = "IPV4"
  addresses          = var.waf_ip_allow_list
}

resource "aws_wafv2_ip_set" "block_list" {
  provider           = aws.us_east_1
  count              = length(var.waf_ip_block_list) > 0 ? 1 : 0
  name               = "${var.project_name}-waf-block"
  description        = "Block list for ${var.project_name} (CloudFront)"
  scope              = local.waf_scope
  ip_address_version = "IPV4"
  addresses          = var.waf_ip_block_list
}

resource "aws_wafv2_web_acl" "cloudfront" {
  provider    = aws.us_east_1
  name        = "${var.project_name}-cloudfront-waf"
  description = "WAF protecting CloudFront for ${var.project_name}"
  scope       = local.waf_scope

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    sampled_requests_enabled   = true
    metric_name                = "${var.project_name}-waf"
  }

  # --------------------
  # Custom rules
  # --------------------

  dynamic "rule" {
    for_each = aws_wafv2_ip_set.allow_list
    content {
      name     = "AllowList"
      priority = 2
      action {
        allow {}
      }

      statement {
        ip_set_reference_statement {
          arn = rule.value.arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
        metric_name                = "${var.project_name}-waf-allowlist"
      }
    }
  }

  dynamic "rule" {
    for_each = aws_wafv2_ip_set.block_list
    content {
      name     = "BlockList"
      priority = 1
      action {
        block {}
      }

      statement {
        ip_set_reference_statement {
          arn = rule.value.arn
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
        metric_name                = "${var.project_name}-waf-blocklist"
      }
    }
  }

  rule {
    name     = "BlockUnsupportedHttpMethods"
    priority = 10
    action {
      block {}
    }

    statement {
      not_statement {
        statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "GET"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "HEAD"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "OPTIONS"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "POST"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "PUT"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "PATCH"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
            statement {
              byte_match_statement {
                search_string         = "DELETE"
                positional_constraint = "EXACTLY"
                field_to_match {
                  method {}
                }
                text_transformation {
                  priority = 0
                  type     = "NONE"
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-methods"
    }
  }

  rule {
    name     = "RateLimit"
    priority = 20
    dynamic "action" {
      for_each = upper(var.waf_rate_limit_action) == "BLOCK" ? [1] : []
      content {
        block {}
      }
    }

    dynamic "action" {
      for_each = upper(var.waf_rate_limit_action) == "COUNT" ? [1] : []
      content {
        count {}
      }
    }

    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-rate"
    }
  }

  # --------------------
  # AWS managed rule groups
  # --------------------
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 100

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-common"
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 110

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-badinputs"
    }
  }

  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 120

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-sqli"
    }
  }

  rule {
    name     = "AWSManagedRulesAnonymousIpList"
    priority = 130

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesAnonymousIpList"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "${var.project_name}-waf-anonip"
    }
  }

  dynamic "rule" {
    for_each = var.waf_enable_bot_control ? [1] : []
    content {
      name     = "AWSManagedRulesBotControl"
      priority = 140

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          name        = "AWSManagedRulesBotControlRuleSet"
          vendor_name = "AWS"
          managed_rule_group_configs {
            aws_managed_rules_bot_control_rule_set {
              inspection_level = "COMMON"
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
        metric_name                = "${var.project_name}-waf-botcontrol"
      }
    }
  }
}

# WAF logging to S3 via Firehose (CloudFront scope requires us-east-1)
resource "random_id" "waf_logs" {
  byte_length = 4
}

resource "aws_s3_bucket" "waf_logs" {
  provider      = aws.us_east_1
  bucket        = "${var.project_name}-waf-logs-${random_id.waf_logs.hex}"
  force_destroy = true
  versioning {
      enabled = true
    }
  tags = {
    Project = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "waf_logs" {
  provider                = aws.us_east_1
  bucket                  = aws_s3_bucket.waf_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "waf_logs" {
  provider = aws.us_east_1
  bucket   = aws_s3_bucket.waf_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "waf_firehose" {
  provider = aws.us_east_1
  name     = "${var.project_name}-waf-firehose"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "waf_firehose" {
  provider = aws.us_east_1
  name     = "${var.project_name}-waf-firehose"
  role     = aws_iam_role.waf_firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.waf_logs.arn,
          "${aws_s3_bucket.waf_logs.arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["logs:PutLogEvents"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kinesis_firehose_delivery_stream" "waf_logs" {
  provider    = aws.us_east_1
  name        = "aws-waf-logs-${var.project_name}-${random_id.waf_logs.hex}"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn           = aws_iam_role.waf_firehose.arn
    bucket_arn         = aws_s3_bucket.waf_logs.arn
    buffering_interval = 300
    buffering_size     = 5
    compression_format = "GZIP"
  }
}

resource "aws_wafv2_web_acl_logging_configuration" "cloudfront" {
  provider = aws.us_east_1

  resource_arn            = aws_wafv2_web_acl.cloudfront.arn
  log_destination_configs = [aws_kinesis_firehose_delivery_stream.waf_logs.arn]

  depends_on = [
    aws_kinesis_firehose_delivery_stream.waf_logs
  ]
}
