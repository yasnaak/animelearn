CREATE TYPE "public"."episode_status" AS ENUM('planned', 'script', 'visuals', 'audio', 'composing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('draft', 'analyzing', 'planned', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('pdf', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'creator', 'pro');--> statement-breakpoint
CREATE TABLE "app_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"episodes_used_this_month" integer DEFAULT 0 NOT NULL,
	"extra_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "app_profiles_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
CREATE TABLE "audio_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"track_type" text NOT NULL,
	"character_id" uuid,
	"audio_url" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"panel_id" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"visual_description" text NOT NULL,
	"character_sheet_url" text,
	"voice_id" text,
	"personality" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text NOT NULL,
	"status" "episode_status" DEFAULT 'planned' NOT NULL,
	"synopsis" text,
	"script" jsonb,
	"visual_prompts" jsonb,
	"audio_direction" jsonb,
	"video_url" text,
	"subtitles_url" text,
	"thumbnail_url" text,
	"duration_seconds" integer,
	"is_public" boolean DEFAULT false NOT NULL,
	"public_slug" text,
	"generation_started_at" timestamp,
	"generation_completed_at" timestamp,
	"generation_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "episodes_public_slug_unique" UNIQUE("public_slug")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"inngest_run_id" text,
	"current_step" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"steps_completed" jsonb,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "panels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"episode_id" uuid NOT NULL,
	"scene_id" text NOT NULL,
	"panel_id" text NOT NULL,
	"panel_order" integer NOT NULL,
	"background_image_url" text,
	"character_layer_url" text,
	"effect_layer_url" text,
	"video_url" text,
	"composite_image_url" text,
	"prompt" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'draft' NOT NULL,
	"source_type" "source_type" NOT NULL,
	"source_url" text,
	"raw_content" text,
	"content_analysis" jsonb,
	"series_plan" jsonb,
	"style" text DEFAULT 'clean_modern' NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"total_episodes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_profiles" ADD CONSTRAINT "app_profiles_auth_user_id_auth_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_tracks" ADD CONSTRAINT "audio_tracks_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audio_tracks" ADD CONSTRAINT "audio_tracks_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panels" ADD CONSTRAINT "panels_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_profiles_auth_user_id_idx" ON "app_profiles" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "audio_tracks_episode_id_idx" ON "audio_tracks" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "characters_project_id_idx" ON "characters" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "episodes_project_id_idx" ON "episodes" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "episodes_public_slug_idx" ON "episodes" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "generation_jobs_episode_id_idx" ON "generation_jobs" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "panels_episode_id_idx" ON "panels" USING btree ("episode_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");