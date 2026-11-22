create or replace function public.convert_lead_to_event(p_lead_id uuid,p_event_date date default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_lead public.leads%rowtype; v_customer_id uuid; v_event_id uuid; v_user_id uuid:=auth.uid(); v_event_name text;
begin
 if v_user_id is null then raise exception 'Authentication required.'; end if;
 select * into v_lead from public.leads where id=p_lead_id for update;
 if not found or not private.is_caterer_member(v_lead.caterer_id) then raise exception 'Enquiry not found or access denied.'; end if;
 if not exists(select 1 from public.caterer_memberships m where m.caterer_id=v_lead.caterer_id and m.user_id=v_user_id and m.role in ('owner','manager')) then raise exception 'Only owners and managers can convert enquiries.'; end if;
 if v_lead.review_status='converted' or exists(select 1 from public.events e where e.lead_id=v_lead.id) then raise exception 'This enquiry has already been converted.'; end if;
 if v_lead.review_status='dismissed' then raise exception 'A dismissed enquiry cannot be converted.'; end if;
 v_customer_id:=v_lead.customer_id;
 if v_customer_id is null then
  insert into public.customers(caterer_id,full_name,phone) values(v_lead.caterer_id,coalesce(nullif(trim(v_lead.contact_name),''),'New customer'),nullif(trim(v_lead.contact_phone),'')) returning id into v_customer_id;
 end if;
 v_event_name:=coalesce(nullif(trim(v_lead.event_type),''),'Catering event')||' - '||coalesce(nullif(trim(v_lead.contact_name),''),'New customer');
 insert into public.events(caterer_id,customer_id,lead_id,event_name,event_type,event_date,venue,expected_guest_count,status,created_by)
 values(v_lead.caterer_id,v_customer_id,v_lead.id,v_event_name,v_lead.event_type,coalesce(p_event_date,v_lead.event_date),v_lead.venue,v_lead.expected_guest_count,'quotation_in_progress',v_user_id) returning id into v_event_id;
 if coalesce(p_event_date,v_lead.event_date) is not null then
  insert into public.event_functions(caterer_id,booking_id,function_name,function_date,venue,expected_guest_count,sort_order)
  values(v_lead.caterer_id,v_event_id,coalesce(nullif(trim(v_lead.event_type),''),'Main event'),coalesce(p_event_date,v_lead.event_date),v_lead.venue,v_lead.expected_guest_count,0);
 end if;
 update public.leads set customer_id=v_customer_id,review_status='converted',status='converted' where id=v_lead.id;
 insert into public.event_activity(caterer_id,event_id,actor_id,activity_type,description,metadata)
 values(v_lead.caterer_id,v_event_id,v_user_id,'lead_converted','Enquiry converted into an event.',jsonb_build_object('lead_id',v_lead.id));
 return v_event_id;
end; $$;
revoke all on function public.convert_lead_to_event(uuid,date) from public,anon;
grant execute on function public.convert_lead_to_event(uuid,date) to authenticated;