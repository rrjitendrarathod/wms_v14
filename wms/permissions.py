import frappe

from wms.public.py.notification  import has_role_profile


def get_permission_query_for_employee(user):
	conditions = ""

	if has_role_profile("WMS Manager") and not has_role_profile("Super Admin") and frappe.session.user != "Administrator" :
		conditions += f"department in ('Coding-R','Quality-R','Leadership-R')"

	return conditions


# medical coder listview permission
def permission_for_roles(user):
	conditions = ""

	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):

		if has_role_profile("Department Head"):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" team_lead = '{production_tls[0]}' "
				else:
					conditions += f" team_lead IN {production_tls} "
			else:
				conditions += " team_lead = ' ' "

		elif has_role_profile("Operations Manager"):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" team_lead = '{production_tls[0]}' "
				else:
					conditions += f" team_lead IN {production_tls} "
			else:
				conditions += " team_lead = ' ' "

		elif has_role_profile("QA Manager"):
			qa_leads = tuple(get_qa_lead())
			if qa_leads:
				if len(qa_leads) == 1:
					conditions += f" assigned_by = '{qa_leads[0]}' "
				else:
					conditions += f" assigned_by IN {qa_leads} "
			else:
				conditions += f" assigned_by = ' ' "

		elif has_role_profile("Production TL"):
			conditions += f" team_lead = '{user}'"

		# elif has_role_profile("QA Lead"):
		# 	conditions += f" assigned_by = '{user}' "

			

		elif has_role_profile("QA Inventory Allocation"):
			chart_status_role = ('Production Completed' ,'Picked for Audit')
			conditions += f" chart_status IN {chart_status_role}"

		elif has_role_profile("QA"):
			conditions += f" email = '{user}' "

	return conditions


def get_production_tl():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Production TL" in frappe.get_roles(user["for_value"])]
	return users if users else []

def get_medical_coders():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Medical Coder" in frappe.get_roles(user["for_value"])]
	return users if users else []

def get_employee():	
	data = frappe.db.sql(f""" select distinct(for_value) from `tabUser Permission` where user="{frappe.session.user}" and allow="Employee" and applicable_for = "Medical Coder Flow" """,as_dict = True)
	employee =[user['for_value'] for user in data]
	return employee if employee else []

def get_qa_lead():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	qa_lead = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
	return qa_lead if qa_lead else []



# bulk upload activity user permission
def permission_for_bulk_upload(user):
	conditions = ""
	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):

		if has_role_profile(["Department Head","Operations Manager"]):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" assigned_manager = '{production_tls[0]}' "
				else:
					conditions += f" assigned_manager IN {production_tls} "
			else:
				conditions += " assigned_manager = ' ' "
		
		elif has_role_profile("Production TL"):
			conditions += f" assigned_manager = '{user}'"
		elif has_role_profile("Medical Coder"):
			conditions += f" assigned_to = '{user}' "

	return conditions

	
# permission for wms manager
def permission_for_user(user):
	conditions = ""

	if has_role_profile("WMS Manager") and not has_role_profile(["Super Admin"]) and frappe.session.user != "Administrator":
		query = f"""SELECT user_id FROM tabEmployee where department in ('Coding-R','Quality-R','Leadership-R')"""
		options = frappe.db.sql(query, as_dict=True)
		users = ','.join([ '"%s"'%name.get("user_id") for name in options ])

		conditions += f"name in ({users})"
	
	elif has_role_profile("Production Inventory Allocation") and not has_role_profile("Super Admin") and frappe.session.user != "Administrator":
		query = f"""
		SELECT name
		FROM tabUser 
		WHERE name IN (
		SELECT parent FROM `tabHas Role`
		WHERE role in ('Production TL')) 
		and enabled = '1' and name NOT IN (
		SELECT parent FROM `tabHas Role`
		WHERE role in ('System Manager','Super Admin','WMS Manager'))
		"""
		options = frappe.db.sql(query, as_dict=True)
		users = ','.join([ '"%s"'%name.get("name") for name in options ])
		conditions += f" name in ({users})"

	return conditions


def role_only_enabled_user(role):
	conditions = ""
	if frappe.session.user != "Administrator":
		conditions += f" Disabled = '{0}' "
	return conditions


def user_in_work_allocation_history(user):
	conditions = ""
	
	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
		if has_role_profile(["Department Head","Operations Manager"]):
			prod_tl = ",".join([ '"%s"'%name for name in get_production_tl()])
			condition = f"assigned_manager in ({prod_tl})"
			
			conditions = f" `tabWork Allocation Activity History`.work_allocation IN ( select distinct(name) from `tabBulk Upload Activities` where {condition} ) " 

		elif has_role_profile("QA Manager"):
			qa_lead = ",".join([ '"%s"'%name for name in get_qa_lead()])
			condition = f" assigned_by in ({qa_lead})"
			conditions = f" `tabWork Allocation Activity History`.work_allocation IN ( select distinct(name) from `tabMedical Coder Flow` where {condition} ) " 

		
		elif has_role_profile("Production TL"):
			condition = f" assigned_manager = '{user}' "
			conditions = f" `tabWork Allocation Activity History`.work_allocation IN ( select distinct(name) from `tabBulk Upload Activities` where {condition} ) " 
			
		elif has_role_profile("QA Lead"):
			condition = f" assigned_by = '{user}' "
			conditions = f" `tabWork Allocation Activity History`.name IN (select distinct(name) from `tabMedical Coder Flow` where {condition} ) " 

		elif has_role_profile("Medical Coder"):
			condition = f" assigned_to = '{user}' "
			conditions = f" `tabWork Allocation Activity History`.name IN ( select distinct(name) from `tabBulk Upload Activities` where {condition} ) "

		elif has_role_profile("QA"):
			condition = f" email = '{user}' "
			conditions = f" `tabWork Allocation Activity History`.name IN ( select distinct(name) from `tabMedical Coder Flow` where {condition} )"

	return conditions


def permisssion_for_qa_weightage(user):
	conditions = ""
	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
		if has_role_profile("Production TL"):
			conditions += f" team_lead = '{user}' and docstatus != 0 "
		# Medical Coder
		if has_role_profile("Medical Coder"): 
			conditions += f" coder_name = '{user}' and docstatus != 0 "
		
		# # QA Lead
		if has_role_profile("QA Lead"):
			conditions += f" qa_lead = '{user}' and docstatus != 0  "
		
		# # QA
		if has_role_profile("QA"):
			conditions += f" qa = '{user}' "

		# Department Head
		# operation manager
		if has_role_profile(["Operations Manager","Department Head"]):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" team_lead = '{production_tls[0]}' and docstatus != 0  "
				else:
					conditions += f" team_lead IN {production_tls}  and docstatus != 0 "
			else:
				conditions += " team_lead = ' ' and docstatus != 0 "
	

		#QA Manager 
		if has_role_profile('QA Manager'):
			qa_lead_user = tuple(get_qa_lead())
			if qa_lead_user:
				if len(qa_lead_user) == 1:
					conditions += f" qa_lead = '{qa_lead_user[0]}' and docstatus != 0 "
				else:
					conditions += f" qa_lead IN {qa_lead_user} and docstatus != 0 "
			else:
				conditions += " qa_lead = ' ' and docstatus != 0 "
			

	return conditions
