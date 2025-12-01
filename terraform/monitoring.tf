resource "aws_cloudwatch_dashboard" "apprunner" {
  dashboard_name = "${var.project_name}-apprunner"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          view    = "timeSeries"
          title   = "App Runner Active Instances"
          region  = var.aws_region
          stat    = "Maximum"
          period  = 60
          metrics = [
            [
              "AWS/AppRunner",
              "ActiveInstances",
              "ServiceName", aws_apprunner_service.backend.service_name,
              "ServiceID",   aws_apprunner_service.backend.service_id
            ]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          view    = "timeSeries"
          title   = "App Runner Requests"
          region  = var.aws_region
          stat    = "Sum"
          period  = 60
          metrics = [
            [
              "AWS/AppRunner",
              "Requests",
              "ServiceName", aws_apprunner_service.backend.service_name,
              "ServiceID",   aws_apprunner_service.backend.service_id
            ]
          ]
        }
      }
    ]
  })
}
