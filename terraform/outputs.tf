output "vpc_id" {
  value = module.vpc.vpc_id
}

output "frontend_bucket_name" {
  value = module.frontend_bucket.s3_bucket_id
}

output "cloudfront_domain" {
  value = module.cloudfront.cloudfront_distribution_domain_name
}

output "ecr_repo_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "apprunner_service_url" {
  value = aws_apprunner_service.backend.service_url
}

output "rds_endpoint" {
  value = module.db.db_instance_address
}

