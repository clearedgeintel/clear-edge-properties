// AUTO-GENERATED from Supabase project ClearEdgeProperties (oqqmaipbieirijzlscls).
// Regenerate via the Supabase MCP generate_typescript_types. Do not edit by hand.

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_call_logs: {
        Row: {
          api_name: string
          created_at: string | null
          endpoint: string | null
          error_message: string | null
          id: string
          request_method: string | null
          request_params: Json | null
          response_status: number | null
          response_time_ms: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          api_name: string
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          request_method?: string | null
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_name?: string
          created_at?: string | null
          endpoint?: string | null
          error_message?: string | null
          id?: string
          request_method?: string | null
          request_params?: Json | null
          response_status?: number | null
          response_time_ms?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_call_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          api_name: string
          created_at: string | null
          endpoint: string | null
          error_count: number | null
          id: string
          request_count: number | null
          success_count: number | null
          tenant_id: string | null
          usage_date: string
        }
        Insert: {
          api_name: string
          created_at?: string | null
          endpoint?: string | null
          error_count?: number | null
          id?: string
          request_count?: number | null
          success_count?: number | null
          tenant_id?: string | null
          usage_date: string
        }
        Update: {
          api_name?: string
          created_at?: string | null
          endpoint?: string | null
          error_count?: number | null
          id?: string
          request_count?: number | null
          success_count?: number | null
          tenant_id?: string | null
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_transactions: {
        Row: {
          amount: number
          created_at: string | null
          credits_added: number | null
          currency: string | null
          description: string | null
          id: string
          status: string | null
          stripe_invoice_id: string | null
          stripe_transaction_id: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          credits_added?: number | null
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_transaction_id?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          credits_added?: number | null
          currency?: string | null
          description?: string | null
          id?: string
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_transaction_id?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json | null
          communication_method: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_type: string | null
          created_at: string | null
          direction: string
          follow_up_date: string | null
          id: string
          is_completed: boolean | null
          message: string | null
          subject: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          user_property_id: string | null
        }
        Insert: {
          attachments?: Json | null
          communication_method?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_type?: string | null
          created_at?: string | null
          direction: string
          follow_up_date?: string | null
          id?: string
          is_completed?: boolean | null
          message?: string | null
          subject?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          user_property_id?: string | null
        }
        Update: {
          attachments?: Json | null
          communication_method?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_type?: string | null
          created_at?: string | null
          direction?: string
          follow_up_date?: string | null
          id?: string
          is_completed?: boolean | null
          message?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          user_property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_user_property_id_fkey"
            columns: ["user_property_id"]
            isOneToOne: false
            referencedRelation: "user_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          tags: string[] | null
          tenant_id: string
          uploaded_at: string | null
          user_id: string
          user_property_id: string
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          tags?: string[] | null
          tenant_id: string
          uploaded_at?: string | null
          user_id: string
          user_property_id: string
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          tags?: string[] | null
          tenant_id?: string
          uploaded_at?: string | null
          user_id?: string
          user_property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_user_property_id_fkey"
            columns: ["user_property_id"]
            isOneToOne: false
            referencedRelation: "user_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          created_at: string | null
          error_data: Json | null
          error_message: string | null
          error_type: string
          id: string
          resolved: boolean | null
          resolved_at: string | null
          retry_count: number | null
          workflow_name: string
          zpid: string | null
        }
        Insert: {
          created_at?: string | null
          error_data?: Json | null
          error_message?: string | null
          error_type: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          workflow_name: string
          zpid?: string | null
        }
        Update: {
          created_at?: string | null
          error_data?: Json | null
          error_message?: string | null
          error_type?: string
          id?: string
          resolved?: boolean | null
          resolved_at?: string | null
          retry_count?: number | null
          workflow_name?: string
          zpid?: string | null
        }
        Relationships: []
      }
      lender_connections: {
        Row: {
          created_at: string | null
          id: string
          is_preferred: boolean | null
          lender_contact_name: string | null
          lender_email: string | null
          lender_name: string
          lender_phone: string | null
          lender_type: string | null
          lender_website: string | null
          notes: string | null
          specialty: string[] | null
          tenant_id: string
          typical_rates: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lender_contact_name?: string | null
          lender_email?: string | null
          lender_name: string
          lender_phone?: string | null
          lender_type?: string | null
          lender_website?: string | null
          notes?: string | null
          specialty?: string[] | null
          tenant_id: string
          typical_rates?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_preferred?: boolean | null
          lender_contact_name?: string | null
          lender_email?: string | null
          lender_name?: string
          lender_phone?: string | null
          lender_type?: string | null
          lender_website?: string | null
          notes?: string | null
          specialty?: string[] | null
          tenant_id?: string
          typical_rates?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lender_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      market_analytics: {
        Row: {
          absorption_rate: number | null
          avg_cap_rate: number | null
          avg_cash_on_cash_roi: number | null
          avg_days_on_market: number | null
          avg_investment_score: number | null
          avg_monthly_cash_flow: number | null
          avg_price: number | null
          created_at: string | null
          id: string
          market: string
          max_price: number | null
          median_days_on_market: number | null
          median_investment_score: number | null
          median_price: number | null
          median_price_per_sqft: number | null
          min_price: number | null
          months_of_inventory: number | null
          new_listings_30d: number | null
          new_listings_7d: number | null
          percent_positive_cashflow: number | null
          price_change_30d_percent: number | null
          price_change_7d_percent: number | null
          price_change_90d_percent: number | null
          price_distribution: Json | null
          properties_positive_cashflow: number | null
          snapshot_date: string
          sold_to_list_price_ratio: number | null
          total_listings: number | null
        }
        Insert: {
          absorption_rate?: number | null
          avg_cap_rate?: number | null
          avg_cash_on_cash_roi?: number | null
          avg_days_on_market?: number | null
          avg_investment_score?: number | null
          avg_monthly_cash_flow?: number | null
          avg_price?: number | null
          created_at?: string | null
          id?: string
          market: string
          max_price?: number | null
          median_days_on_market?: number | null
          median_investment_score?: number | null
          median_price?: number | null
          median_price_per_sqft?: number | null
          min_price?: number | null
          months_of_inventory?: number | null
          new_listings_30d?: number | null
          new_listings_7d?: number | null
          percent_positive_cashflow?: number | null
          price_change_30d_percent?: number | null
          price_change_7d_percent?: number | null
          price_change_90d_percent?: number | null
          price_distribution?: Json | null
          properties_positive_cashflow?: number | null
          snapshot_date: string
          sold_to_list_price_ratio?: number | null
          total_listings?: number | null
        }
        Update: {
          absorption_rate?: number | null
          avg_cap_rate?: number | null
          avg_cash_on_cash_roi?: number | null
          avg_days_on_market?: number | null
          avg_investment_score?: number | null
          avg_monthly_cash_flow?: number | null
          avg_price?: number | null
          created_at?: string | null
          id?: string
          market?: string
          max_price?: number | null
          median_days_on_market?: number | null
          median_investment_score?: number | null
          median_price?: number | null
          median_price_per_sqft?: number | null
          min_price?: number | null
          months_of_inventory?: number | null
          new_listings_30d?: number | null
          new_listings_7d?: number | null
          percent_positive_cashflow?: number | null
          price_change_30d_percent?: number | null
          price_change_7d_percent?: number | null
          price_change_90d_percent?: number | null
          price_distribution?: Json | null
          properties_positive_cashflow?: number | null
          snapshot_date?: string
          sold_to_list_price_ratio?: number | null
          total_listings?: number | null
        }
        Relationships: []
      }
      market_template_markets: {
        Row: {
          created_at: string
          id: string
          location: string
          max_price: number | null
          min_price: number | null
          name: string
          sort_order: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location: string
          max_price?: number | null
          min_price?: number | null
          name: string
          sort_order?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          max_price?: number | null
          min_price?: number | null
          name?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_template_markets_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "market_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      market_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          template_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          template_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      motivated_seller_analysis: {
        Row: {
          analyzed_at: string
          created_at: string | null
          emails_in_description: string[] | null
          id: string
          is_fsbo: boolean | null
          keywords_found: string[] | null
          mild_keywords: string[] | null
          moderate_keywords: string[] | null
          motivation_level: string
          motivation_score: number
          negative_keywords: string[] | null
          phones_in_description: string[] | null
          urgent_keywords: string[] | null
          zpid: string
        }
        Insert: {
          analyzed_at: string
          created_at?: string | null
          emails_in_description?: string[] | null
          id?: string
          is_fsbo?: boolean | null
          keywords_found?: string[] | null
          mild_keywords?: string[] | null
          moderate_keywords?: string[] | null
          motivation_level: string
          motivation_score: number
          negative_keywords?: string[] | null
          phones_in_description?: string[] | null
          urgent_keywords?: string[] | null
          zpid: string
        }
        Update: {
          analyzed_at?: string
          created_at?: string | null
          emails_in_description?: string[] | null
          id?: string
          is_fsbo?: boolean | null
          keywords_found?: string[] | null
          mild_keywords?: string[] | null
          moderate_keywords?: string[] | null
          motivation_level?: string
          motivation_score?: number
          negative_keywords?: string[] | null
          phones_in_description?: string[] | null
          urgent_keywords?: string[] | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "motivated_seller_analysis_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "motivated_seller_analysis_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "motivated_seller_analysis_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      notification_settings: {
        Row: {
          channel: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link_url: string | null
          message: string | null
          notification_type: string
          read_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          notification_type: string
          read_at?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link_url?: string | null
          message?: string | null
          notification_type?: string
          read_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          additional_terms: string | null
          contingencies: string[] | null
          counter_offer_amount: number | null
          counter_offer_terms: string | null
          created_at: string | null
          earnest_money: number | null
          expiration_date: string | null
          financing_type: string | null
          id: string
          inspection_period_days: number | null
          notes: string | null
          offer_amount: number
          offer_letter_url: string | null
          proposed_closing_date: string | null
          response_received_at: string | null
          sent_at: string | null
          status: string | null
          supporting_documents: Json | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          user_property_id: string
        }
        Insert: {
          additional_terms?: string | null
          contingencies?: string[] | null
          counter_offer_amount?: number | null
          counter_offer_terms?: string | null
          created_at?: string | null
          earnest_money?: number | null
          expiration_date?: string | null
          financing_type?: string | null
          id?: string
          inspection_period_days?: number | null
          notes?: string | null
          offer_amount: number
          offer_letter_url?: string | null
          proposed_closing_date?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          supporting_documents?: Json | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          user_property_id: string
        }
        Update: {
          additional_terms?: string | null
          contingencies?: string[] | null
          counter_offer_amount?: number | null
          counter_offer_terms?: string | null
          created_at?: string | null
          earnest_money?: number | null
          expiration_date?: string | null
          financing_type?: string | null
          id?: string
          inspection_period_days?: number | null
          notes?: string | null
          offer_amount?: number
          offer_letter_url?: string | null
          proposed_closing_date?: string | null
          response_received_at?: string | null
          sent_at?: string | null
          status?: string | null
          supporting_documents?: Json | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          user_property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_user_property_id_fkey"
            columns: ["user_property_id"]
            isOneToOne: false
            referencedRelation: "user_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          order_index: number
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          order_index: number
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          order_index?: number
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prequalifications: {
        Row: {
          approved_down_payment_percent: number | null
          approved_interest_rate: number | null
          created_at: string | null
          expiration_date: string | null
          id: string
          lender_connection_id: string | null
          loan_term_years: number | null
          loan_type: string | null
          max_loan_amount: number | null
          notes: string | null
          pre_approval_letter_url: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_down_payment_percent?: number | null
          approved_interest_rate?: number | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          lender_connection_id?: string | null
          loan_term_years?: number | null
          loan_type?: string | null
          max_loan_amount?: number | null
          notes?: string | null
          pre_approval_letter_url?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_down_payment_percent?: number | null
          approved_interest_rate?: number | null
          created_at?: string | null
          expiration_date?: string | null
          id?: string
          lender_connection_id?: string | null
          loan_term_years?: number | null
          loan_type?: string | null
          max_loan_amount?: number | null
          notes?: string | null
          pre_approval_letter_url?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prequalifications_lender_connection_id_fkey"
            columns: ["lender_connection_id"]
            isOneToOne: false
            referencedRelation: "lender_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prequalifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prequalifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          created_at: string | null
          event_date: string
          event_type: string | null
          id: string
          price: number
          price_change: number | null
          zpid: string
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_type?: string | null
          id?: string
          price: number
          price_change?: number | null
          zpid: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string | null
          id?: string
          price?: number
          price_change?: number | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "price_history_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "price_history_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      properties: {
        Row: {
          address: string | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          annual_cash_flow: number | null
          cap_rate_percent: number | null
          cash_on_cash_roi: number | null
          closing_costs: number | null
          county: string | null
          created_at: string | null
          days_on_zillow: number | null
          down_payment: number | null
          dscr: number | null
          equity_at_purchase: number | null
          fetch_count: number | null
          five_year_gain: number | null
          full_address: string | null
          home_status: string | null
          home_type: string | null
          img_main: string | null
          investment_score_percent: number | null
          is_below_zestimate: boolean | null
          is_cash_flow_negative: boolean | null
          is_foreclosure: boolean | null
          is_new_construction: boolean | null
          is_rent_estimate_missing: boolean | null
          last_fetched_at: string | null
          latitude: number | null
          list_price: number | null
          listing_status: string | null
          living_area_sq_ft: number | null
          longitude: number | null
          monthly_cash_flow: number | null
          monthly_expenses: number | null
          monthly_mortgage: number | null
          monthly_taxes: number | null
          num_baths: number | null
          num_beds: number | null
          price: number | null
          price_per_sq_ft: number | null
          rent_estimate: number | null
          rent_zestimate: number | null
          search_market: string
          size_sq_ft: number | null
          tax_assessed: number | null
          tax_assessed_value: number | null
          total_cash_needed: number | null
          updated_at: string | null
          url: string | null
          year_built: number | null
          zestimate: number | null
          zpid: string
        }
        Insert: {
          address?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_cash_flow?: number | null
          cap_rate_percent?: number | null
          cash_on_cash_roi?: number | null
          closing_costs?: number | null
          county?: string | null
          created_at?: string | null
          days_on_zillow?: number | null
          down_payment?: number | null
          dscr?: number | null
          equity_at_purchase?: number | null
          fetch_count?: number | null
          five_year_gain?: number | null
          full_address?: string | null
          home_status?: string | null
          home_type?: string | null
          img_main?: string | null
          investment_score_percent?: number | null
          is_below_zestimate?: boolean | null
          is_cash_flow_negative?: boolean | null
          is_foreclosure?: boolean | null
          is_new_construction?: boolean | null
          is_rent_estimate_missing?: boolean | null
          last_fetched_at?: string | null
          latitude?: number | null
          list_price?: number | null
          listing_status?: string | null
          living_area_sq_ft?: number | null
          longitude?: number | null
          monthly_cash_flow?: number | null
          monthly_expenses?: number | null
          monthly_mortgage?: number | null
          monthly_taxes?: number | null
          num_baths?: number | null
          num_beds?: number | null
          price?: number | null
          price_per_sq_ft?: number | null
          rent_estimate?: number | null
          rent_zestimate?: number | null
          search_market: string
          size_sq_ft?: number | null
          tax_assessed?: number | null
          tax_assessed_value?: number | null
          total_cash_needed?: number | null
          updated_at?: string | null
          url?: string | null
          year_built?: number | null
          zestimate?: number | null
          zpid: string
        }
        Update: {
          address?: string | null
          address_city?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          annual_cash_flow?: number | null
          cap_rate_percent?: number | null
          cash_on_cash_roi?: number | null
          closing_costs?: number | null
          county?: string | null
          created_at?: string | null
          days_on_zillow?: number | null
          down_payment?: number | null
          dscr?: number | null
          equity_at_purchase?: number | null
          fetch_count?: number | null
          five_year_gain?: number | null
          full_address?: string | null
          home_status?: string | null
          home_type?: string | null
          img_main?: string | null
          investment_score_percent?: number | null
          is_below_zestimate?: boolean | null
          is_cash_flow_negative?: boolean | null
          is_foreclosure?: boolean | null
          is_new_construction?: boolean | null
          is_rent_estimate_missing?: boolean | null
          last_fetched_at?: string | null
          latitude?: number | null
          list_price?: number | null
          listing_status?: string | null
          living_area_sq_ft?: number | null
          longitude?: number | null
          monthly_cash_flow?: number | null
          monthly_expenses?: number | null
          monthly_mortgage?: number | null
          monthly_taxes?: number | null
          num_baths?: number | null
          num_beds?: number | null
          price?: number | null
          price_per_sq_ft?: number | null
          rent_estimate?: number | null
          rent_zestimate?: number | null
          search_market?: string
          size_sq_ft?: number | null
          tax_assessed?: number | null
          tax_assessed_value?: number | null
          total_cash_needed?: number | null
          updated_at?: string | null
          url?: string | null
          year_built?: number | null
          zestimate?: number | null
          zpid?: string
        }
        Relationships: []
      }
      property_activities: {
        Row: {
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          tenant_id: string
          title: string | null
          user_id: string
          user_property_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
          title?: string | null
          user_id: string
          user_property_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
          title?: string | null
          user_id?: string
          user_property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activities_user_property_id_fkey"
            columns: ["user_property_id"]
            isOneToOne: false
            referencedRelation: "user_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_alert_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          notification_channel: string
          property_alert_id: string
          read_at: string | null
          sent_at: string | null
          user_id: string
          was_read: boolean | null
          was_sent: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_channel: string
          property_alert_id: string
          read_at?: string | null
          sent_at?: string | null
          user_id: string
          was_read?: boolean | null
          was_sent?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          notification_channel?: string
          property_alert_id?: string
          read_at?: string | null
          sent_at?: string | null
          user_id?: string
          was_read?: boolean | null
          was_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "property_alert_notifications_property_alert_id_fkey"
            columns: ["property_alert_id"]
            isOneToOne: false
            referencedRelation: "property_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alert_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_alerts: {
        Row: {
          alert_data: Json | null
          alert_type: string
          created_at: string | null
          id: string
          message: string | null
          priority: string | null
          zpid: string
        }
        Insert: {
          alert_data?: Json | null
          alert_type: string
          created_at?: string | null
          id?: string
          message?: string | null
          priority?: string | null
          zpid: string
        }
        Update: {
          alert_data?: Json | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string | null
          priority?: string | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_alerts_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_alerts_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_alerts_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      property_comparables: {
        Row: {
          comp_address: string | null
          comp_baths: number | null
          comp_beds: number | null
          comp_city: string | null
          comp_lot_sqft: number | null
          comp_price: number | null
          comp_price_per_sqft: number | null
          comp_source: string | null
          comp_sqft: number | null
          comp_state: string | null
          comp_url: string | null
          comp_year_built: number | null
          comp_zip: string | null
          comp_zpid: string | null
          distance_miles: number | null
          fetched_at: string | null
          id: string
          sale_date: string | null
          similarity_score: number | null
          zpid: string
        }
        Insert: {
          comp_address?: string | null
          comp_baths?: number | null
          comp_beds?: number | null
          comp_city?: string | null
          comp_lot_sqft?: number | null
          comp_price?: number | null
          comp_price_per_sqft?: number | null
          comp_source?: string | null
          comp_sqft?: number | null
          comp_state?: string | null
          comp_url?: string | null
          comp_year_built?: number | null
          comp_zip?: string | null
          comp_zpid?: string | null
          distance_miles?: number | null
          fetched_at?: string | null
          id?: string
          sale_date?: string | null
          similarity_score?: number | null
          zpid: string
        }
        Update: {
          comp_address?: string | null
          comp_baths?: number | null
          comp_beds?: number | null
          comp_city?: string | null
          comp_lot_sqft?: number | null
          comp_price?: number | null
          comp_price_per_sqft?: number | null
          comp_source?: string | null
          comp_sqft?: number | null
          comp_state?: string | null
          comp_url?: string | null
          comp_year_built?: number | null
          comp_zip?: string | null
          comp_zpid?: string | null
          distance_miles?: number | null
          fetched_at?: string | null
          id?: string
          sale_date?: string | null
          similarity_score?: number | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_comparables_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_comparables_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_comparables_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      property_details: {
        Row: {
          air_risk_label: string | null
          air_risk_score: number | null
          annual_homeowners_insurance: number | null
          annual_property_tax: number | null
          brokerage_name: string | null
          brokerage_phone: string | null
          co_listing_agent_name: string | null
          co_listing_agent_phone: string | null
          created_at: string | null
          description: string | null
          fire_risk_label: string | null
          fire_risk_score: number | null
          flood_risk_label: string | null
          flood_risk_score: number | null
          frontage_feet: number | null
          heat_risk_label: string | null
          heat_risk_score: number | null
          high_school_district: string | null
          listing_agent_email: string | null
          listing_agent_name: string | null
          listing_agent_phone: string | null
          lot_size_acres: number | null
          middle_school_district: string | null
          mls_id: string | null
          mls_name: string | null
          premier_agent_business: string | null
          premier_agent_name: string | null
          premier_agent_phone: string | null
          primary_school_district: string | null
          property_tax_rate: number | null
          schools_summary: string | null
          updated_at: string | null
          wind_risk_label: string | null
          wind_risk_score: number | null
          zpid: string
        }
        Insert: {
          air_risk_label?: string | null
          air_risk_score?: number | null
          annual_homeowners_insurance?: number | null
          annual_property_tax?: number | null
          brokerage_name?: string | null
          brokerage_phone?: string | null
          co_listing_agent_name?: string | null
          co_listing_agent_phone?: string | null
          created_at?: string | null
          description?: string | null
          fire_risk_label?: string | null
          fire_risk_score?: number | null
          flood_risk_label?: string | null
          flood_risk_score?: number | null
          frontage_feet?: number | null
          heat_risk_label?: string | null
          heat_risk_score?: number | null
          high_school_district?: string | null
          listing_agent_email?: string | null
          listing_agent_name?: string | null
          listing_agent_phone?: string | null
          lot_size_acres?: number | null
          middle_school_district?: string | null
          mls_id?: string | null
          mls_name?: string | null
          premier_agent_business?: string | null
          premier_agent_name?: string | null
          premier_agent_phone?: string | null
          primary_school_district?: string | null
          property_tax_rate?: number | null
          schools_summary?: string | null
          updated_at?: string | null
          wind_risk_label?: string | null
          wind_risk_score?: number | null
          zpid: string
        }
        Update: {
          air_risk_label?: string | null
          air_risk_score?: number | null
          annual_homeowners_insurance?: number | null
          annual_property_tax?: number | null
          brokerage_name?: string | null
          brokerage_phone?: string | null
          co_listing_agent_name?: string | null
          co_listing_agent_phone?: string | null
          created_at?: string | null
          description?: string | null
          fire_risk_label?: string | null
          fire_risk_score?: number | null
          flood_risk_label?: string | null
          flood_risk_score?: number | null
          frontage_feet?: number | null
          heat_risk_label?: string | null
          heat_risk_score?: number | null
          high_school_district?: string | null
          listing_agent_email?: string | null
          listing_agent_name?: string | null
          listing_agent_phone?: string | null
          lot_size_acres?: number | null
          middle_school_district?: string | null
          mls_id?: string | null
          mls_name?: string | null
          premier_agent_business?: string | null
          premier_agent_name?: string | null
          premier_agent_phone?: string | null
          primary_school_district?: string | null
          property_tax_rate?: number | null
          schools_summary?: string | null
          updated_at?: string | null
          wind_risk_label?: string | null
          wind_risk_score?: number | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_details_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_details_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: true
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "property_details_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: true
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      property_scenarios: {
        Row: {
          after_repair_value: number | null
          annual_cash_flow: number | null
          annual_insurance: number | null
          annual_rent_increase_percent: number | null
          appreciation_rate_percent: number | null
          cap_rate: number | null
          capex_reserve_monthly: number | null
          cash_on_cash_roi: number | null
          closing_costs_fixed: number | null
          closing_costs_percent: number | null
          created_at: string | null
          down_payment_percent: number | null
          dscr: number | null
          equity_buildup: number | null
          exit_strategy: string | null
          hoa_monthly: number | null
          hold_period_years: number | null
          id: string
          interest_rate: number | null
          irr: number | null
          is_baseline: boolean | null
          loan_term_years: number | null
          maintenance_percent: number | null
          monthly_cash_flow: number | null
          monthly_mortgage_payment: number | null
          monthly_rent: number | null
          notes: string | null
          other_monthly_income: number | null
          property_management_percent: number | null
          property_tax_rate_percent: number | null
          purchase_price: number | null
          renovation_budget: number | null
          renovation_timeline_months: number | null
          scenario_name: string
          selling_costs_percent: number | null
          tenant_id: string
          total_cash_needed: number | null
          total_profit_at_exit: number | null
          updated_at: string | null
          user_property_id: string
          utilities_monthly: number | null
          vacancy_rate_percent: number | null
        }
        Insert: {
          after_repair_value?: number | null
          annual_cash_flow?: number | null
          annual_insurance?: number | null
          annual_rent_increase_percent?: number | null
          appreciation_rate_percent?: number | null
          cap_rate?: number | null
          capex_reserve_monthly?: number | null
          cash_on_cash_roi?: number | null
          closing_costs_fixed?: number | null
          closing_costs_percent?: number | null
          created_at?: string | null
          down_payment_percent?: number | null
          dscr?: number | null
          equity_buildup?: number | null
          exit_strategy?: string | null
          hoa_monthly?: number | null
          hold_period_years?: number | null
          id?: string
          interest_rate?: number | null
          irr?: number | null
          is_baseline?: boolean | null
          loan_term_years?: number | null
          maintenance_percent?: number | null
          monthly_cash_flow?: number | null
          monthly_mortgage_payment?: number | null
          monthly_rent?: number | null
          notes?: string | null
          other_monthly_income?: number | null
          property_management_percent?: number | null
          property_tax_rate_percent?: number | null
          purchase_price?: number | null
          renovation_budget?: number | null
          renovation_timeline_months?: number | null
          scenario_name: string
          selling_costs_percent?: number | null
          tenant_id: string
          total_cash_needed?: number | null
          total_profit_at_exit?: number | null
          updated_at?: string | null
          user_property_id: string
          utilities_monthly?: number | null
          vacancy_rate_percent?: number | null
        }
        Update: {
          after_repair_value?: number | null
          annual_cash_flow?: number | null
          annual_insurance?: number | null
          annual_rent_increase_percent?: number | null
          appreciation_rate_percent?: number | null
          cap_rate?: number | null
          capex_reserve_monthly?: number | null
          cash_on_cash_roi?: number | null
          closing_costs_fixed?: number | null
          closing_costs_percent?: number | null
          created_at?: string | null
          down_payment_percent?: number | null
          dscr?: number | null
          equity_buildup?: number | null
          exit_strategy?: string | null
          hoa_monthly?: number | null
          hold_period_years?: number | null
          id?: string
          interest_rate?: number | null
          irr?: number | null
          is_baseline?: boolean | null
          loan_term_years?: number | null
          maintenance_percent?: number | null
          monthly_cash_flow?: number | null
          monthly_mortgage_payment?: number | null
          monthly_rent?: number | null
          notes?: string | null
          other_monthly_income?: number | null
          property_management_percent?: number | null
          property_tax_rate_percent?: number | null
          purchase_price?: number | null
          renovation_budget?: number | null
          renovation_timeline_months?: number | null
          scenario_name?: string
          selling_costs_percent?: number | null
          tenant_id?: string
          total_cash_needed?: number | null
          total_profit_at_exit?: number | null
          updated_at?: string | null
          user_property_id?: string
          utilities_monthly?: number | null
          vacancy_rate_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_scenarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_scenarios_user_property_id_fkey"
            columns: ["user_property_id"]
            isOneToOne: false
            referencedRelation: "user_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      realtor_enriched_data: {
        Row: {
          agent_name: string
          brokerage_name: string | null
          brokerage_website: string | null
          cities: string | null
          confidence_score: number | null
          created_at: string | null
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          phone: string | null
          property_count: number | null
          sources: string[] | null
          states: string | null
          unique_cities: number | null
          unique_states: number | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          agent_name: string
          brokerage_name?: string | null
          brokerage_website?: string | null
          cities?: string | null
          confidence_score?: number | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          phone?: string | null
          property_count?: number | null
          sources?: string[] | null
          states?: string | null
          unique_cities?: number | null
          unique_states?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          agent_name?: string
          brokerage_name?: string | null
          brokerage_website?: string | null
          cities?: string | null
          confidence_score?: number | null
          created_at?: string | null
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          phone?: string | null
          property_count?: number | null
          sources?: string[] | null
          states?: string | null
          unique_cities?: number | null
          unique_states?: number | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      saved_search_matches: {
        Row: {
          id: string
          match_date: string | null
          saved_search_id: string
          was_notified: boolean | null
          zpid: string
        }
        Insert: {
          id?: string
          match_date?: string | null
          saved_search_id: string
          was_notified?: boolean | null
          zpid: string
        }
        Update: {
          id?: string
          match_date?: string | null
          saved_search_id?: string
          was_notified?: boolean | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_matches_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_matches_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "saved_search_matches_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "saved_search_matches_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_channels: string[] | null
          alert_frequency: string | null
          created_at: string | null
          filters: Json
          id: string
          is_active: boolean | null
          last_match_count: number | null
          last_run_at: string | null
          markets: string[] | null
          search_name: string
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_channels?: string[] | null
          alert_frequency?: string | null
          created_at?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_match_count?: number | null
          last_run_at?: string | null
          markets?: string[] | null
          search_name: string
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_channels?: string[] | null
          alert_frequency?: string | null
          created_at?: string | null
          filters?: Json
          id?: string
          is_active?: boolean | null
          last_match_count?: number | null
          last_run_at?: string | null
          markets?: string[] | null
          search_name?: string
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          api_credits_remaining: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          max_searches_per_month: number | null
          max_tracked_properties: number | null
          max_users: number | null
          name: string
          settings: Json | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string
          updated_at: string | null
        }
        Insert: {
          api_credits_remaining?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          max_searches_per_month?: number | null
          max_tracked_properties?: number | null
          max_users?: number | null
          name: string
          settings?: Json | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          updated_at?: string | null
        }
        Update: {
          api_credits_remaining?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          max_searches_per_month?: number | null
          max_tracked_properties?: number | null
          max_users?: number | null
          name?: string
          settings?: Json | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_properties: {
        Row: {
          added_at: string | null
          custom_analysis: Json | null
          custom_notes: string | null
          id: string
          is_favorite: boolean | null
          pipeline_stage_id: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          updated_at: string | null
          user_id: string
          user_investment_score: number | null
          zpid: string
        }
        Insert: {
          added_at?: string | null
          custom_analysis?: Json | null
          custom_notes?: string | null
          id?: string
          is_favorite?: boolean | null
          pipeline_stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
          user_investment_score?: number | null
          zpid: string
        }
        Update: {
          added_at?: string | null
          custom_analysis?: Json | null
          custom_notes?: string | null
          id?: string
          is_favorite?: boolean | null
          pipeline_stage_id?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
          user_investment_score?: number | null
          zpid?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_properties_pipeline_stage"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_properties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["zpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          last_login_at: string | null
          notification_preferences: Json | null
          phone: string | null
          role: string
          supabase_user_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role?: string
          supabase_user_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          role?: string
          supabase_user_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          error_details: Json | null
          errors_count: number | null
          execution_status: string
          execution_time_seconds: number | null
          id: string
          properties_added: number | null
          properties_processed: number | null
          properties_updated: number | null
          started_at: string | null
          workflow_name: string
        }
        Insert: {
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number | null
          execution_status: string
          execution_time_seconds?: number | null
          id?: string
          properties_added?: number | null
          properties_processed?: number | null
          properties_updated?: number | null
          started_at?: string | null
          workflow_name: string
        }
        Update: {
          completed_at?: string | null
          error_details?: Json | null
          errors_count?: number | null
          execution_status?: string
          execution_time_seconds?: number | null
          id?: string
          properties_added?: number | null
          properties_processed?: number | null
          properties_updated?: number | null
          started_at?: string | null
          workflow_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      properties_with_motivation: {
        Row: {
          address: string | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          annual_cash_flow: number | null
          cap_rate_percent: number | null
          cash_on_cash_roi: number | null
          closing_costs: number | null
          county: string | null
          created_at: string | null
          days_on_zillow: number | null
          down_payment: number | null
          dscr: number | null
          equity_at_purchase: number | null
          fetch_count: number | null
          five_year_gain: number | null
          full_address: string | null
          home_status: string | null
          home_type: string | null
          img_main: string | null
          investment_score_percent: number | null
          is_below_zestimate: boolean | null
          is_cash_flow_negative: boolean | null
          is_foreclosure: boolean | null
          is_fsbo: boolean | null
          is_new_construction: boolean | null
          is_rent_estimate_missing: boolean | null
          last_fetched_at: string | null
          latitude: number | null
          list_price: number | null
          listing_status: string | null
          living_area_sq_ft: number | null
          longitude: number | null
          monthly_cash_flow: number | null
          monthly_expenses: number | null
          monthly_mortgage: number | null
          monthly_taxes: number | null
          motivation_analyzed_at: string | null
          motivation_level: string | null
          motivation_score: number | null
          num_baths: number | null
          num_beds: number | null
          price: number | null
          price_per_sq_ft: number | null
          rent_estimate: number | null
          rent_zestimate: number | null
          search_market: string | null
          size_sq_ft: number | null
          tax_assessed: number | null
          tax_assessed_value: number | null
          total_cash_needed: number | null
          updated_at: string | null
          url: string | null
          year_built: number | null
          zestimate: number | null
          zpid: string | null
        }
        Relationships: []
      }
      user_properties_full: {
        Row: {
          address: string | null
          address_city: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          annual_cash_flow: number | null
          brokerage_name: string | null
          cap_rate_percent: number | null
          cash_on_cash_roi: number | null
          closing_costs: number | null
          county: string | null
          created_at: string | null
          days_on_zillow: number | null
          description: string | null
          down_payment: number | null
          dscr: number | null
          equity_at_purchase: number | null
          fetch_count: number | null
          five_year_gain: number | null
          full_address: string | null
          home_status: string | null
          home_type: string | null
          img_main: string | null
          investment_score_percent: number | null
          is_below_zestimate: boolean | null
          is_cash_flow_negative: boolean | null
          is_foreclosure: boolean | null
          is_new_construction: boolean | null
          is_rent_estimate_missing: boolean | null
          last_fetched_at: string | null
          latitude: number | null
          list_price: number | null
          listing_agent_email: string | null
          listing_agent_name: string | null
          listing_agent_phone: string | null
          listing_status: string | null
          living_area_sq_ft: number | null
          longitude: number | null
          monthly_cash_flow: number | null
          monthly_expenses: number | null
          monthly_mortgage: number | null
          monthly_taxes: number | null
          num_baths: number | null
          num_beds: number | null
          pipeline_stage_color: string | null
          pipeline_stage_name: string | null
          price: number | null
          price_per_sq_ft: number | null
          rent_estimate: number | null
          rent_zestimate: number | null
          search_market: string | null
          size_sq_ft: number | null
          tax_assessed: number | null
          tax_assessed_value: number | null
          total_cash_needed: number | null
          updated_at: string | null
          url: string | null
          userzpid: string | null
          year_built: number | null
          zestimate: number | null
          zpid: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["userzpid"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["userzpid"]
            isOneToOne: false
            referencedRelation: "properties_with_motivation"
            referencedColumns: ["zpid"]
          },
          {
            foreignKeyName: "user_properties_zpid_fkey"
            columns: ["userzpid"]
            isOneToOne: false
            referencedRelation: "user_properties_full"
            referencedColumns: ["zpid"]
          },
        ]
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      calculate_investment_metrics: {
        Args: {
          p_annual_insurance: number
          p_down_payment_percent: number
          p_interest_rate: number
          p_loan_term_years: number
          p_maintenance_percent: number
          p_monthly_rent: number
          p_property_mgmt_percent: number
          p_property_tax_rate: number
          p_purchase_price: number
        }
        Returns: Json
      }
      create_default_pipeline_stages: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_user_tenant_id: { Args: never; Returns: string }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_has_role: { Args: { required_role: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
  public: {
    Enums: {},
  },
} as const
