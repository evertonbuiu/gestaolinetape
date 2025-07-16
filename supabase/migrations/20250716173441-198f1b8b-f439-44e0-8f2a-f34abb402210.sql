-- Temporariamente desabilitar RLS para clientes e eventos para corrigir o problema
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.events DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete clients" ON public.clients;

DROP POLICY IF EXISTS "Users can view events" ON public.events;
DROP POLICY IF EXISTS "Users can insert events" ON public.events;
DROP POLICY IF EXISTS "Users can update events" ON public.events;
DROP POLICY IF EXISTS "Users can delete events" ON public.events;

-- Criar políticas mais permissivas para clientes
CREATE POLICY "Anyone authenticated can view clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can insert clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can delete clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (true);

-- Criar políticas mais permissivas para eventos
CREATE POLICY "Anyone authenticated can view events" 
ON public.events 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can insert events" 
ON public.events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Anyone authenticated can update events" 
ON public.events 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Anyone authenticated can delete events" 
ON public.events 
FOR DELETE 
TO authenticated
USING (true);