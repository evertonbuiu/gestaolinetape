import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '')

    // Verify the user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      throw new Error('Only admins can create employee accounts')
    }

    const { username, password, name, role = 'funcionario' } = await req.json()

    if (!username || !password || !name) {
      throw new Error('Username, password, and name are required')
    }

    // Validate role
    if (!['admin', 'funcionario', 'financeiro'].includes(role)) {
      throw new Error('Invalid role specified')
    }

    // Check if username already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('user_credentials')
      .select('id')
      .eq('username', username)
      .maybeSingle()

    if (checkError) {
      throw new Error('Error checking existing user')
    }

    if (existingUser) {
      throw new Error('Username already exists')
    }

    // Create the user credentials
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('user_credentials')
      .insert({
        username,
        password_hash: password, // In production, hash this properly
        name,
        is_active: true
      })
      .select()
      .single()

    if (createError) {
      throw createError
    }

    // Create user role with specified role
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.id,
        role: role
      })

    if (roleInsertError) {
      throw roleInsertError
    }

    return new Response(
      JSON.stringify({ 
        user: newUser,
        message: 'Employee created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating employee:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})