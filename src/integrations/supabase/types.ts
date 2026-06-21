export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      comentario_curtidas: {
        Row: {
          comentario_id: string;
          criado_em: string;
          usuario_id: string;
        };
        Insert: {
          comentario_id: string;
          criado_em?: string;
          usuario_id?: string;
        };
        Update: {
          comentario_id?: string;
          criado_em?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comentario_curtidas_comentario_id_fkey";
            columns: ["comentario_id"];
            isOneToOne: false;
            referencedRelation: "comentarios_jogo";
            referencedColumns: ["id"];
          },
        ];
      };
      comentarios_jogo: {
        Row: {
          criado_em: string;
          id: string;
          jogo_id: string;
          mensagem: string;
          parent_id: string | null;
          usuario_id: string;
          usuario_nome: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          jogo_id: string;
          mensagem: string;
          parent_id?: string | null;
          usuario_id?: string;
          usuario_nome: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          jogo_id?: string;
          mensagem?: string;
          parent_id?: string | null;
          usuario_id?: string;
          usuario_nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comentarios_jogo_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comentarios_jogo";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes_usuario: {
        Row: {
          comentario_id: string;
          comentario_pai_id: string;
          criado_em: string;
          id: string;
          jogo_id: string;
          lida_em: string | null;
          tipo: string;
          usuario_destino_id: string;
          usuario_origem_id: string;
        };
        Insert: {
          comentario_id: string;
          comentario_pai_id: string;
          criado_em?: string;
          id?: string;
          jogo_id: string;
          lida_em?: string | null;
          tipo: string;
          usuario_destino_id: string;
          usuario_origem_id: string;
        };
        Update: {
          comentario_id?: string;
          comentario_pai_id?: string;
          criado_em?: string;
          id?: string;
          jogo_id?: string;
          lida_em?: string | null;
          tipo?: string;
          usuario_destino_id?: string;
          usuario_origem_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notificacoes_usuario_comentario_id_fkey";
            columns: ["comentario_id"];
            isOneToOne: false;
            referencedRelation: "comentarios_jogo";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_usuario_comentario_pai_id_fkey";
            columns: ["comentario_pai_id"];
            isOneToOne: false;
            referencedRelation: "comentarios_jogo";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          role: string;
          updated_at: string;
          username: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
          username: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
          username?: string;
        };
        Relationships: [];
      };
      palpites: {
        Row: {
          criado_em: string | null;
          id: string;
          palpite_a: number;
          palpite_b: number;
          partida_id: string;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string | null;
          id?: string;
          palpite_a: number;
          palpite_b: number;
          partida_id: string;
          usuario_id?: string;
        };
        Update: {
          criado_em?: string | null;
          id?: string;
          palpite_a?: number;
          palpite_b?: number;
          partida_id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "palpites_partida_id_fkey";
            columns: ["partida_id"];
            isOneToOne: false;
            referencedRelation: "partidas";
            referencedColumns: ["id"];
          },
        ];
      };
      partidas: {
        Row: {
          acrescimos: number | null;
          cartoes: Json | null;
          escalacao_a: Json | null;
          escalacao_b: Json | null;
          estatisticas_a: Json | null;
          estatisticas_b: Json | null;
          fase: string | null;
          fase_polling: string | null;
          gols: Json | null;
          grupo: string | null;
          id: string;
          inicia_em: string | null;
          minuto: number | null;
          placar_a: number;
          placar_b: number;
          placar_parcial_a: number | null;
          placar_parcial_b: number | null;
          rodada: number | null;
          status: string;
          substituicoes: Json | null;
          time_a: string;
          time_b: string;
          ultima_atualizacao_api: string | null;
          ultima_busca_api: string | null;
        };
        Insert: {
          acrescimos?: number | null;
          cartoes?: Json | null;
          escalacao_a?: Json | null;
          escalacao_b?: Json | null;
          estatisticas_a?: Json | null;
          estatisticas_b?: Json | null;
          fase?: string | null;
          fase_polling?: string | null;
          gols?: Json | null;
          grupo?: string | null;
          id: string;
          inicia_em?: string | null;
          minuto?: number | null;
          placar_a?: number;
          placar_b?: number;
          placar_parcial_a?: number | null;
          placar_parcial_b?: number | null;
          rodada?: number | null;
          status?: string;
          substituicoes?: Json | null;
          time_a: string;
          time_b: string;
          ultima_atualizacao_api?: string | null;
          ultima_busca_api?: string | null;
        };
        Update: {
          acrescimos?: number | null;
          cartoes?: Json | null;
          escalacao_a?: Json | null;
          escalacao_b?: Json | null;
          estatisticas_a?: Json | null;
          estatisticas_b?: Json | null;
          fase?: string | null;
          fase_polling?: string | null;
          gols?: Json | null;
          grupo?: string | null;
          id?: string;
          inicia_em?: string | null;
          minuto?: number | null;
          placar_a?: number;
          placar_b?: number;
          placar_parcial_a?: number | null;
          placar_parcial_b?: number | null;
          rodada?: number | null;
          status?: string;
          substituicoes?: Json | null;
          time_a?: string;
          time_b?: string;
          ultima_atualizacao_api?: string | null;
          ultima_busca_api?: string | null;
        };
        Relationships: [];
      };
      selecoes: {
        Row: {
          api_payload: Json;
          area_bandeira: string | null;
          area_codigo: string | null;
          area_id: number | null;
          area_nome: string | null;
          atualizado_em: string;
          competicoes: Json;
          cores: string | null;
          elenco: Json;
          endereco: string | null;
          escudo_url: string | null;
          football_data_id: number | null;
          fundada: number | null;
          id: string;
          nome: string;
          nome_curto: string | null;
          sigla: string | null;
          site: string | null;
          staff: Json;
          tecnico_data_nascimento: string | null;
          tecnico_nacionalidade: string | null;
          tecnico_nome: string | null;
          ultima_atualizacao: string | null;
        };
        Insert: {
          api_payload?: Json;
          area_bandeira?: string | null;
          area_codigo?: string | null;
          area_id?: number | null;
          area_nome?: string | null;
          atualizado_em?: string;
          competicoes?: Json;
          cores?: string | null;
          elenco?: Json;
          endereco?: string | null;
          escudo_url?: string | null;
          football_data_id?: never;
          fundada?: number | null;
          id: string;
          nome: string;
          nome_curto?: string | null;
          sigla?: string | null;
          site?: string | null;
          staff?: Json;
          tecnico_data_nascimento?: string | null;
          tecnico_nacionalidade?: string | null;
          tecnico_nome?: string | null;
          ultima_atualizacao?: string | null;
        };
        Update: {
          api_payload?: Json;
          area_bandeira?: string | null;
          area_codigo?: string | null;
          area_id?: number | null;
          area_nome?: string | null;
          atualizado_em?: string;
          competicoes?: Json;
          cores?: string | null;
          elenco?: Json;
          endereco?: string | null;
          escudo_url?: string | null;
          football_data_id?: never;
          fundada?: number | null;
          id?: string;
          nome?: string;
          nome_curto?: string | null;
          sigla?: string | null;
          site?: string | null;
          staff?: Json;
          tecnico_data_nascimento?: string | null;
          tecnico_nacionalidade?: string | null;
          tecnico_nome?: string | null;
          ultima_atualizacao?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      ranking: {
        Row: {
          jogos_pontuados: number | null;
          pontos: number | null;
          usuario_id: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      listar_comentarios_jogo: {
        Args: Record<PropertyKey, never>;
        Returns: {
          criado_em: string;
          curtidas_count: number;
          curtido_por_mim: boolean;
          id: string;
          jogo_id: string;
          mensagem: string;
          parent_id: string | null;
          respostas_count: number;
          usuario_id: string;
          usuario_nome: string;
        }[];
      };
      listar_notificacoes_respostas: {
        Args: {
          limit_count?: number;
        };
        Returns: {
          comentario_id: string;
          comentario_mensagem: string;
          comentario_pai_id: string;
          comentario_pai_mensagem: string;
          criado_em: string;
          id: string;
          jogo_id: string;
          lida_em: string | null;
          tipo: string;
          usuario_destino_id: string;
          usuario_origem_id: string;
          usuario_origem_nome: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
