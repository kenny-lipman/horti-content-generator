export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  horti: {
    Tables: {
      accessories: {
        Row: {
          accessory_type: string
          color: string | null
          compatible_pot_sizes: number[] | null
          dimensions: Json | null
          id: string
          material: string | null
          product_id: string
          style_tags: string[] | null
        }
        Insert: {
          accessory_type: string
          color?: string | null
          compatible_pot_sizes?: number[] | null
          dimensions?: Json | null
          id?: string
          material?: string | null
          product_id: string
          style_tags?: string[] | null
        }
        Update: {
          accessory_type?: string
          color?: string | null
          compatible_pot_sizes?: number[] | null
          dimensions?: Json | null
          id?: string
          material?: string | null
          product_id?: string
          style_tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cut_flower_attributes: {
        Row: {
          bunch_size: number | null
          color_primary: string | null
          color_secondary: string | null
          fragrant: boolean | null
          id: string
          product_id: string
          season: string | null
          stem_length: number | null
          vase_life_days: number | null
        }
        Insert: {
          bunch_size?: number | null
          color_primary?: string | null
          color_secondary?: string | null
          fragrant?: boolean | null
          id?: string
          product_id: string
          season?: string | null
          stem_length?: number | null
          vase_life_days?: number | null
        }
        Update: {
          bunch_size?: number | null
          color_primary?: string | null
          color_secondary?: string | null
          fragrant?: boolean | null
          id?: string
          product_id?: string
          season?: string | null
          stem_length?: number | null
          vase_life_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cut_flower_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_images: {
        Row: {
          combination_id: string | null
          created_at: string | null
          error: string | null
          generation_duration_ms: number | null
          generation_model: string | null
          id: string
          image_type: string
          image_url: string | null
          organization_id: string
          parent_image_id: string | null
          product_id: string
          prompt_used: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          scene_template_id: string | null
          seed: number | null
          source_image_id: string | null
          status: string
          temperature: number | null
          updated_at: string | null
        }
        Insert: {
          combination_id?: string | null
          created_at?: string | null
          error?: string | null
          generation_duration_ms?: number | null
          generation_model?: string | null
          id?: string
          image_type: string
          image_url?: string | null
          organization_id: string
          parent_image_id?: string | null
          product_id: string
          prompt_used?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scene_template_id?: string | null
          seed?: number | null
          source_image_id?: string | null
          status?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Update: {
          combination_id?: string | null
          created_at?: string | null
          error?: string | null
          generation_duration_ms?: number | null
          generation_model?: string | null
          id?: string
          image_type?: string
          image_url?: string | null
          organization_id?: string
          parent_image_id?: string | null
          product_id?: string
          prompt_used?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scene_template_id?: string | null
          seed?: number | null
          source_image_id?: string | null
          status?: string
          temperature?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_images_combination_id_fkey"
            columns: ["combination_id"]
            isOneToOne: false
            referencedRelation: "product_combinations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_parent_image_id_fkey"
            columns: ["parent_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_scene_template_id_fkey"
            columns: ["scene_template_id"]
            isOneToOne: false
            referencedRelation: "scene_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_images_source_image_id_fkey"
            columns: ["source_image_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          completed_images: number
          created_at: string | null
          created_by: string | null
          failed_images: number
          id: string
          image_types_requested: string[]
          organization_id: string
          product_id: string
          started_at: string | null
          status: string
          total_images: number
        }
        Insert: {
          completed_at?: string | null
          completed_images?: number
          created_at?: string | null
          created_by?: string | null
          failed_images?: number
          id?: string
          image_types_requested: string[]
          organization_id: string
          product_id: string
          started_at?: string | null
          status?: string
          total_images?: number
        }
        Update: {
          completed_at?: string | null
          completed_images?: number
          created_at?: string | null
          created_by?: string | null
          failed_images?: number
          id?: string
          image_types_requested?: string[]
          organization_id?: string
          product_id?: string
          started_at?: string | null
          status?: string
          total_images?: number
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_usage: {
        Row: {
          amount_due: number | null
          completed_count: number
          created_at: string | null
          failed_count: number
          id: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at: string | null
        }
        Insert: {
          amount_due?: number | null
          completed_count?: number
          created_at?: string | null
          failed_count?: number
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          updated_at?: string | null
        }
        Update: {
          amount_due?: number | null
          completed_count?: number
          created_at?: string | null
          failed_count?: number
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      image_variants: {
        Row: {
          created_at: string | null
          file_size: number | null
          format: string
          generated_image_id: string
          height: number
          id: string
          image_url: string
          purpose: string
          width: number
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          format: string
          generated_image_id: string
          height: number
          id?: string
          image_url: string
          purpose: string
          width: number
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          format?: string
          generated_image_id?: string
          height?: number
          id?: string
          image_url?: string
          purpose?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "image_variants_generated_image_id_fkey"
            columns: ["generated_image_id"]
            isOneToOne: false
            referencedRelation: "generated_images"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_rows: number | null
          errors: Json | null
          file_name: string
          file_url: string
          id: string
          organization_id: string
          processed_rows: number | null
          status: string
          template_id: string
          total_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_rows?: number | null
          errors?: Json | null
          file_name: string
          file_url: string
          id?: string
          organization_id: string
          processed_rows?: number | null
          status?: string
          template_id: string
          total_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_rows?: number | null
          errors?: Json | null
          file_name?: string
          file_url?: string
          id?: string
          organization_id?: string
          processed_rows?: number | null
          status?: string
          template_id?: string
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "import_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      import_templates: {
        Row: {
          business_type: string
          column_mappings: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          product_type: string
          sample_file_url: string | null
          version: number | null
        }
        Insert: {
          business_type: string
          column_mappings: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          product_type: string
          sample_file_url?: string | null
          version?: number | null
        }
        Update: {
          business_type?: string
          column_mappings?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          product_type?: string
          sample_file_url?: string | null
          version?: number | null
        }
        Relationships: []
      }
      integration_product_mappings: {
        Row: {
          created_at: string | null
          external_product_id: string
          external_variant_id: string | null
          id: string
          integration_id: string
          last_synced_at: string | null
          product_id: string
          sync_status: string | null
        }
        Insert: {
          created_at?: string | null
          external_product_id: string
          external_variant_id?: string | null
          id?: string
          integration_id: string
          last_synced_at?: string | null
          product_id: string
          sync_status?: string | null
        }
        Update: {
          created_at?: string | null
          external_product_id?: string
          external_variant_id?: string | null
          id?: string
          integration_id?: string
          last_synced_at?: string | null
          product_id?: string
          sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_product_mappings_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_product_mappings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_logs: {
        Row: {
          completed_at: string | null
          direction: string
          error_details: Json | null
          id: string
          integration_id: string
          items_failed: number | null
          items_processed: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          direction: string
          error_details?: Json | null
          id?: string
          integration_id: string
          items_failed?: number | null
          items_processed?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          direction?: string
          error_details?: Json | null
          id?: string
          integration_id?: string
          items_failed?: number | null
          items_processed?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string | null
          credentials: Json | null
          id: string
          last_sync_at: string | null
          organization_id: string
          platform: string
          settings: Json | null
          status: string
          store_name: string | null
          store_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          organization_id: string
          platform: string
          settings?: Json | null
          status?: string
          store_name?: string | null
          store_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          platform?: string
          settings?: Json | null
          status?: string
          store_name?: string | null
          store_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          organization_id: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          organization_id: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          organization_id?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_business_types: {
        Row: {
          business_type: string
          created_at: string | null
          id: string
          organization_id: string
        }
        Insert: {
          business_type: string
          created_at?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          business_type?: string
          created_at?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_business_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invited_at: string | null
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invited_at?: string | null
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_modules: {
        Row: {
          enabled_at: string | null
          id: string
          module: string
          organization_id: string
        }
        Insert: {
          enabled_at?: string | null
          id?: string
          module: string
          organization_id: string
        }
        Update: {
          enabled_at?: string | null
          id?: string
          module?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_cycle_start: string | null
          billing_email: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          mollie_customer_id: string | null
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          billing_cycle_start?: string | null
          billing_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          mollie_customer_id?: string | null
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          billing_cycle_start?: string | null
          billing_email?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          mollie_customer_id?: string | null
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      plant_attributes: {
        Row: {
          availability: string | null
          can_bloom: boolean | null
          carrier_carriage_type: string | null
          carrier_fust_code: number | null
          carrier_fust_type: string | null
          carrier_layers: number | null
          carrier_per_layer: number | null
          carrier_units: number | null
          id: string
          is_artificial: boolean | null
          plant_height: number | null
          pot_diameter: number | null
          product_id: string
          vbn_code: string | null
        }
        Insert: {
          availability?: string | null
          can_bloom?: boolean | null
          carrier_carriage_type?: string | null
          carrier_fust_code?: number | null
          carrier_fust_type?: string | null
          carrier_layers?: number | null
          carrier_per_layer?: number | null
          carrier_units?: number | null
          id?: string
          is_artificial?: boolean | null
          plant_height?: number | null
          pot_diameter?: number | null
          product_id: string
          vbn_code?: string | null
        }
        Update: {
          availability?: string | null
          can_bloom?: boolean | null
          carrier_carriage_type?: string | null
          carrier_fust_code?: number | null
          carrier_fust_type?: string | null
          carrier_layers?: number | null
          carrier_per_layer?: number | null
          carrier_units?: number | null
          id?: string
          is_artificial?: boolean | null
          plant_height?: number | null
          pot_diameter?: number | null
          product_id?: string
          vbn_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_combinations: {
        Row: {
          accessory_id: string
          created_at: string | null
          id: string
          is_favorite: boolean
          notes: string | null
          organization_id: string
          product_id: string
          scene_template_id: string | null
        }
        Insert: {
          accessory_id: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          organization_id: string
          product_id: string
          scene_template_id?: string | null
        }
        Update: {
          accessory_id?: string
          created_at?: string | null
          id?: string
          is_favorite?: boolean
          notes?: string | null
          organization_id?: string
          product_id?: string
          scene_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_combinations_accessory_id_fkey"
            columns: ["accessory_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combinations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combinations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_combinations_scene_template_id_fkey"
            columns: ["scene_template_id"]
            isOneToOne: false
            referencedRelation: "scene_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          catalog_image_url: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          product_type: string
          sku: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          catalog_image_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          product_type: string
          sku?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          catalog_image_url?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          product_type?: string
          sku?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retail_attributes: {
        Row: {
          collections: string[] | null
          compare_at_price: number | null
          currency: string | null
          id: string
          long_description: string | null
          price: number | null
          product_id: string
          short_description: string | null
          variants: Json | null
        }
        Insert: {
          collections?: string[] | null
          compare_at_price?: number | null
          currency?: string | null
          id?: string
          long_description?: string | null
          price?: number | null
          product_id: string
          short_description?: string | null
          variants?: Json | null
        }
        Update: {
          collections?: string[] | null
          compare_at_price?: number | null
          currency?: string | null
          id?: string
          long_description?: string | null
          price?: number | null
          product_id?: string
          short_description?: string | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "retail_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      scene_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_system: boolean | null
          name: string
          organization_id: string | null
          prompt_template: string
          scene_type: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          organization_id?: string | null
          prompt_template: string
          scene_type: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          organization_id?: string | null
          prompt_template?: string
          scene_type?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scene_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      source_images: {
        Row: {
          created_at: string | null
          file_size: number | null
          has_white_background: boolean | null
          height: number | null
          id: string
          image_type: string
          image_url: string
          mime_type: string | null
          organization_id: string
          product_id: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_size?: number | null
          has_white_background?: boolean | null
          height?: number | null
          id?: string
          image_type?: string
          image_url: string
          mime_type?: string | null
          organization_id: string
          product_id?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_size?: number | null
          has_white_background?: boolean | null
          height?: number | null
          id?: string
          image_type?: string
          image_url?: string
          mime_type?: string | null
          organization_id?: string
          product_id?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "source_images_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_photos: number | null
          min_photos: number
          name: string
          price_monthly: number
          price_per_photo: number | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_photos?: number | null
          min_photos?: number
          name: string
          price_monthly: number
          price_per_photo?: number | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_photos?: number | null
          min_photos?: number
          name?: string
          price_monthly?: number
          price_per_photo?: number | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          payment_provider_id: string | null
          plan_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          organization_id: string
          payment_provider_id?: string | null
          plan_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          payment_provider_id?: string | null
          plan_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_org_ids: { Args: never; Returns: string[] }
      release_generation_usage: {
        Args: { p_organization_id: string; p_release_count: number }
        Returns: undefined
      }
      reserve_generation_usage: {
        Args: { p_organization_id: string; p_requested_count: number }
        Returns: Json
      }
      upsert_generation_usage: {
        Args: {
          p_completed_count: number
          p_failed_count: number
          p_organization_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  horti: {
    Enums: {},
  },
} as const
