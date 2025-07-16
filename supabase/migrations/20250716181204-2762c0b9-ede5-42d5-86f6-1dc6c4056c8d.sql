-- Fix RLS policies to allow authenticated users full access

-- Fix equipment table policies
DROP POLICY IF EXISTS "Users can view equipment" ON public.equipment;
DROP POLICY IF EXISTS "Users can manage equipment" ON public.equipment;

CREATE POLICY "Authenticated users can view equipment" 
ON public.equipment 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert equipment" 
ON public.equipment 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipment" 
ON public.equipment 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete equipment" 
ON public.equipment 
FOR DELETE 
TO authenticated
USING (true);

-- Fix event_equipment table policies
DROP POLICY IF EXISTS "Users can view event equipment" ON public.event_equipment;
DROP POLICY IF EXISTS "Users can manage event equipment" ON public.event_equipment;

CREATE POLICY "Authenticated users can view event equipment" 
ON public.event_equipment 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert event equipment" 
ON public.event_equipment 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update event equipment" 
ON public.event_equipment 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete event equipment" 
ON public.event_equipment 
FOR DELETE 
TO authenticated
USING (true);