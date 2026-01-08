# Terraform Variables Definition
# Copy terraform.tfvars.example to terraform.tfvars and fill in values

variable "stripe_secret_key" {
  description = "Stripe secret API key"
  type        = string
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
}

variable "sendgrid_api_key" {
  description = "SendGrid API key"
  type        = string
  sensitive   = true
}

variable "worker_token" {
  description = "Authentication token for worker service"
  type        = string
  sensitive   = true
}

# Note: Railway Redis URL is managed in Railway dashboard
# Reference it in services using: REDIS_URL=${{Redis.REDIS_URL}}
