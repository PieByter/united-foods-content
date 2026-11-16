CREATE TABLE "app_settings" (
	"owner_id" uuid PRIMARY KEY NOT NULL,
	"workspace_name" text DEFAULT 'United Foods Content' NOT NULL,
	"owner_name" text DEFAULT 'Chef Ayu' NOT NULL,
	"owner_role" text DEFAULT 'Head Baker & R&D' NOT NULL,
	"currency" char(3) DEFAULT 'IDR' NOT NULL,
	"default_price_strategy" text DEFAULT 'latest' NOT NULL,
	"target_food_cost_pct" numeric(6, 2) DEFAULT '30' NOT NULL,
	"target_margin_pct" numeric(6, 2) DEFAULT '70' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"actor" text DEFAULT 'Chef Ayu' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "costing_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"recipe_version_id" uuid NOT NULL,
	"label" text,
	"scale_factor" numeric(18, 6) DEFAULT '1' NOT NULL,
	"price_strategy" text DEFAULT 'latest' NOT NULL,
	"as_of" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_material_cost" numeric(18, 6) NOT NULL,
	"overhead_cost" numeric(18, 6) DEFAULT '0' NOT NULL,
	"total_cost" numeric(18, 6) NOT NULL,
	"effective_yield_qty" numeric(18, 6) NOT NULL,
	"yield_unit" text NOT NULL,
	"cost_per_unit" numeric(18, 6) NOT NULL,
	"items_breakdown" jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'Chef Ayu' NOT NULL,
	CONSTRAINT "costing_snapshot_strategy_check" CHECK ("costing_snapshot"."price_strategy" in ('latest','average','snapshot')),
	CONSTRAINT "costing_snapshot_factor_check" CHECK ("costing_snapshot"."scale_factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"category" text NOT NULL,
	"base_unit" text NOT NULL,
	"base_dimension" text NOT NULL,
	"discrete" boolean DEFAULT false NOT NULL,
	"stock_qty" numeric(18, 6),
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_dimension_check" CHECK ("ingredient"."base_dimension" in ('mass','volume','count'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_conversion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"from_unit" text NOT NULL,
	"to_unit" text NOT NULL,
	"factor" numeric(18, 6) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_conversion_uq" UNIQUE("ingredient_id","from_unit","to_unit"),
	CONSTRAINT "ingredient_conversion_factor_check" CHECK ("ingredient_conversion"."factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "ingredient_price" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"purchase_qty" numeric(18, 6) NOT NULL,
	"purchase_unit" text NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"price_per_base_unit" numeric(18, 6) NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_by" text DEFAULT 'Chef Ayu' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_price_qty_check" CHECK ("ingredient_price"."purchase_qty" > 0),
	CONSTRAINT "ingredient_price_price_check" CHECK ("ingredient_price"."price" >= 0),
	CONSTRAINT "ingredient_price_base_price_check" CHECK ("ingredient_price"."price_per_base_unit" >= 0)
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"bucket" text DEFAULT 'recipe-media' NOT NULL,
	"path" text NOT NULL,
	"mime_type" text NOT NULL,
	"alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_scenario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"selling_price" numeric(18, 6) NOT NULL,
	"margin_pct" numeric(10, 2) NOT NULL,
	"markup_pct" numeric(10, 2) NOT NULL,
	"food_cost_pct" numeric(10, 2) NOT NULL,
	"target_margin_pct" numeric(6, 2),
	"rounding_to" numeric(18, 0),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_scenario_price_check" CHECK ("pricing_scenario"."selling_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'Bakery & Roti' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"locale" text DEFAULT 'id-ID' NOT NULL,
	"author_id" uuid,
	"is_subrecipe" boolean DEFAULT false NOT NULL,
	"current_version_id" uuid,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_status_check" CHECK ("recipe"."status" in ('draft','published'))
);
--> statement-breakpoint
CREATE TABLE "recipe_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipe_version_id" uuid NOT NULL,
	"item_type" text NOT NULL,
	"ref_id" uuid,
	"label" text,
	"qty" numeric(18, 6) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'gr' NOT NULL,
	"discrete" boolean DEFAULT false NOT NULL,
	"rounding" text DEFAULT 'none' NOT NULL,
	"non_linear_scaling" boolean DEFAULT false NOT NULL,
	"note" text,
	"overhead_kind" text,
	"overhead_value" numeric(18, 6),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_item_type_check" CHECK ("recipe_item"."item_type" in ('ingredient','subrecipe','overhead')),
	CONSTRAINT "recipe_item_rounding_check" CHECK ("recipe_item"."rounding" in ('none','half','whole')),
	CONSTRAINT "recipe_item_qty_check" CHECK ("recipe_item"."qty" >= 0),
	CONSTRAINT "recipe_item_overhead_check" CHECK ("recipe_item"."overhead_kind" is null or "recipe_item"."overhead_kind" in ('fixed','percent')),
	CONSTRAINT "recipe_item_overhead_value_check" CHECK ("recipe_item"."overhead_value" is null or "recipe_item"."overhead_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipe_version_id" uuid NOT NULL,
	"step_no" integer NOT NULL,
	"instruction" text NOT NULL,
	"duration_sec" integer,
	"media_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_step_no_uq" UNIQUE("recipe_version_id","step_no")
);
--> statement-breakpoint
CREATE TABLE "recipe_tag" (
	"recipe_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "recipe_tag_recipe_id_tag_id_pk" PRIMARY KEY("recipe_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"yield_qty" numeric(18, 6) NOT NULL,
	"yield_unit" text NOT NULL,
	"unit_weight_g" numeric(18, 6),
	"yield_loss_pct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" text DEFAULT 'Chef Ayu' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_version_no_uq" UNIQUE("recipe_id","version_no"),
	CONSTRAINT "recipe_version_yield_check" CHECK ("recipe_version"."yield_qty" > 0),
	CONSTRAINT "recipe_version_loss_check" CHECK ("recipe_version"."yield_loss_pct" >= 0 and "recipe_version"."yield_loss_pct" < 100)
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_owner_slug_uq" UNIQUE("owner_id","slug")
);
--> statement-breakpoint
ALTER TABLE "costing_snapshot" ADD CONSTRAINT "costing_snapshot_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "costing_snapshot" ADD CONSTRAINT "costing_snapshot_recipe_version_id_recipe_version_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_conversion" ADD CONSTRAINT "ingredient_conversion_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_price" ADD CONSTRAINT "ingredient_price_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_scenario" ADD CONSTRAINT "pricing_scenario_snapshot_id_costing_snapshot_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."costing_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_item" ADD CONSTRAINT "recipe_item_recipe_version_id_recipe_version_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step" ADD CONSTRAINT "recipe_step_recipe_version_id_recipe_version_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_step" ADD CONSTRAINT "recipe_step_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tag" ADD CONSTRAINT "recipe_tag_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_tag" ADD CONSTRAINT "recipe_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_version" ADD CONSTRAINT "recipe_version_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_owner_created_idx" ON "audit_log" USING btree ("owner_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "costing_snapshot_recipe_computed_idx" ON "costing_snapshot" USING btree ("recipe_id","computed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ingredient_owner_category_idx" ON "ingredient" USING btree ("owner_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_owner_sku_uq" ON "ingredient" USING btree ("owner_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_owner_name_uq" ON "ingredient" USING btree ("owner_id",lower("name")) WHERE "ingredient"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "ingredient_price_ingredient_effective_idx" ON "ingredient_price" USING btree ("ingredient_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pricing_scenario_snapshot_idx" ON "pricing_scenario" USING btree ("snapshot_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_owner_slug_uq" ON "recipe" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_owner_code_uq" ON "recipe" USING btree ("owner_id","code");--> statement-breakpoint
CREATE INDEX "recipe_owner_status_idx" ON "recipe" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "recipe_item_version_idx" ON "recipe_item" USING btree ("recipe_version_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_version_recipe_idx" ON "recipe_version" USING btree ("recipe_id","version_no" DESC NULLS LAST);