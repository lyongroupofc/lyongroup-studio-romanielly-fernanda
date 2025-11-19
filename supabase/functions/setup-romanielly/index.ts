import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Criando usuário Romanielly Fernanda');

    // Verificar se já existe
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === 'romanielly@gmail.com');

    if (userExists) {
      console.log('Usuário já existe');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Usuário já existe',
          user_id: userExists.id
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      );
    }

    // Criar usuário no auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'romanielly@gmail.com',
      password: '96469394',
      email_confirm: true,
      user_metadata: {
        nome: 'Romanielly Fernanda'
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      throw authError;
    }

    console.log('Usuário criado:', authData.user.id);

    // Aguardar trigger criar profile
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar se role já existe
    const { data: existingRole } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', authData.user.id)
      .single();

    if (!existingRole) {
      // Adicionar role de admin
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'admin'
        });

      if (roleError) {
        console.error('Erro ao criar role:', roleError);
        throw roleError;
      }

      console.log('Role admin atribuída com sucesso');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        user_id: authData.user.id,
        message: 'Usuário criado com sucesso! Email: romanielly@gmail.com, Senha: 96469394'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error('Erro:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    );
  }
});
