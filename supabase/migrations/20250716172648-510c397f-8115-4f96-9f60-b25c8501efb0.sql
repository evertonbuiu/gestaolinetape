-- Fix RLS policies for clients table
DROP POLICY IF EXISTS "Users can manage clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view all clients" ON public.clients;

-- Create specific policies for clients
CREATE POLICY "Users can view clients" 
ON public.clients 
FOR SELECT 
USING (has_permission(auth.uid(), 'clients_view', 'view'));

CREATE POLICY "Users can insert clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'clients_edit', 'edit'));

CREATE POLICY "Users can update clients" 
ON public.clients 
FOR UPDATE 
USING (has_permission(auth.uid(), 'clients_edit', 'edit'));

CREATE POLICY "Users can delete clients" 
ON public.clients 
FOR DELETE 
USING (has_permission(auth.uid(), 'clients_edit', 'edit'));

-- Fix RLS policies for events table
DROP POLICY IF EXISTS "Users can manage events based on permissions" ON public.events;
DROP POLICY IF EXISTS "Users can view events based on permissions" ON public.events;

-- Create specific policies for events
CREATE POLICY "Users can view events" 
ON public.events 
FOR SELECT 
USING (has_permission(auth.uid(), 'rentals_view', 'view'));

CREATE POLICY "Users can insert events" 
ON public.events 
FOR INSERT 
WITH CHECK (has_permission(auth.uid(), 'rentals_edit', 'edit'));

CREATE POLICY "Users can update events" 
ON public.events 
FOR UPDATE 
USING (has_permission(auth.uid(), 'rentals_edit', 'edit'));

CREATE POLICY "Users can delete events" 
ON public.events 
FOR DELETE 
USING (has_permission(auth.uid(), 'rentals_edit', 'edit'));