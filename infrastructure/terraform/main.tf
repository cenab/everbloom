# Everbloom Wedding Platform - Infrastructure as Code
# Terraform configuration for cloud resources
#
# NOTE: Railway Redis is managed via Railway dashboard/CLI, not Terraform.
# Add Redis as a service in your Railway project and reference with ${{Redis.REDIS_URL}}

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }

  # Uncomment to use remote state (recommended for production)
  # backend "s3" {
  #   bucket = "everbloom-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

# Variables
variable "environment" {
  description = "Environment name (production, staging)"
  type        = string
  default     = "production"
}

variable "supabase_access_token" {
  description = "Supabase Management API access token"
  type        = string
  sensitive   = true
}

variable "supabase_org_id" {
  description = "Supabase organization ID"
  type        = string
}

variable "supabase_db_password" {
  description = "Database password for Supabase project"
  type        = string
  sensitive   = true
}

variable "vercel_api_token" {
  description = "Vercel API token"
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (optional)"
  type        = string
  default     = null
}

variable "domain" {
  description = "Primary domain for the platform"
  type        = string
  default     = "everbloom.wedding"
}

variable "github_repo" {
  description = "GitHub repository (org/repo format)"
  type        = string
  default     = "your-org/wedding-bestie"
}

# Providers
provider "supabase" {
  access_token = var.supabase_access_token
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

# Supabase Project
resource "supabase_project" "main" {
  organization_id   = var.supabase_org_id
  name              = "everbloom-${var.environment}"
  database_password = var.supabase_db_password
  region            = "us-east-1"

  lifecycle {
    prevent_destroy = true
  }
}

# Vercel Project - Platform UI
resource "vercel_project" "platform_ui" {
  name      = "everbloom-platform-${var.environment}"
  framework = "vite"

  git_repository {
    type = "github"
    repo = var.github_repo
  }

  root_directory   = "apps/platform-ui"
  build_command    = "pnpm build"
  output_directory = "dist"

  environment {
    key    = "VITE_API_URL"
    value  = "https://api.${var.domain}/api"
    target = ["production"]
  }
}

# Vercel Domain
resource "vercel_project_domain" "platform_ui" {
  project_id = vercel_project.platform_ui.id
  domain     = "app.${var.domain}"
}

# Outputs
output "supabase_project_url" {
  description = "Supabase project URL"
  value       = supabase_project.main.endpoint
}

output "supabase_anon_key" {
  description = "Supabase anonymous key"
  value       = supabase_project.main.anon_key
  sensitive   = true
}

output "vercel_platform_url" {
  description = "Vercel Platform UI URL"
  value       = "https://app.${var.domain}"
}

# Railway Redis - Not managed by Terraform
#
# To set up Redis in Railway:
# 1. Go to your Railway project
# 2. Click "New Service" → "Database" → "Redis"
# 3. Railway automatically provisions Redis
# 4. Reference in other services: REDIS_URL=${{Redis.REDIS_URL}}
#
# The REDIS_URL will be in format: redis://default:password@host:port
