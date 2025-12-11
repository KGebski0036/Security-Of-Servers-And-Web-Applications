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
      priority = 1
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
      priority = 2
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
    action {
      block {}
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
