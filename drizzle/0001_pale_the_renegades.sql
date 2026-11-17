CREATE TABLE "recipe_video" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"platform" text DEFAULT 'other' NOT NULL,
	"thumbnail_url" text,
	"duration_sec" integer,
	"author_name" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_video_platform_check" CHECK ("recipe_video"."platform" in ('youtube','vimeo','instagram','tiktok','other')),
	CONSTRAINT "recipe_video_source_check" CHECK ("recipe_video"."source" in ('manual','ai')),
	CONSTRAINT "recipe_video_duration_check" CHECK ("recipe_video"."duration_sec" is null or "recipe_video"."duration_sec" >= 0),
	CONSTRAINT "recipe_video_sort_check" CHECK ("recipe_video"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "recipe_video" ADD CONSTRAINT "recipe_video_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_video_recipe_idx" ON "recipe_video" USING btree ("recipe_id","sort_order");