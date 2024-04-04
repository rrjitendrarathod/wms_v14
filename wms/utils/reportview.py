import frappe
from frappe.model.base_document import get_controller
from frappe.desk.reportview import (
	get_form_params,
	compress,
	is_virtual_doctype,
	execute
	)
from wms.public.py.notification  import has_role_profile

@frappe.whitelist()
@frappe.read_only()
def get():
	try:
		args = get_form_params()
		# If virtual doctype get data from controller het_list method
		if is_virtual_doctype(args.doctype):
			controller = get_controller(args.doctype)
			data = compress(controller(args.doctype).get_list(args))

		if args.doctype in ["Medical Coder Flow"] and  has_role_profile("QA Lead")and  frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Department Head","Super Admin"]):
			args.filters.append(["Medical Coder Flow","assigned_by","=",frappe.session.user])
			data = compress(execute(**args), args=args)
		else:
			data = compress(execute(**args), args=args)
		return data
	except Exception as e:
		frappe.log_error(e,'list_view_error')

@frappe.whitelist()
@frappe.read_only()
def get_count():
	args = get_form_params()

	if is_virtual_doctype(args.doctype):
		controller = get_controller(args.doctype)
		data = controller(args.doctype).get_count(args)
	
	else:
		distinct = 'distinct ' if args.distinct=='true' else ''
		if args.doctype in ["Medical Coder Flow"] and  has_role_profile("QA Lead")and  frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Department Head","Super Admin"]):
			args.filters.append(["Medical Coder Flow","assigned_by","=",frappe.session.user])

		
		args.fields = [f"count({distinct}`tab{args.doctype}`.name) as total_count"]

		data = execute(**args)[0].get('total_count')

	return data



def get_mc_users():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	curr_emp =[user['for_value'] for user in data]
	return curr_emp


def get_employee_workallocation():
	try:
		user = frappe.session.user
		data = frappe.db.sql(""" select distinct(for_value) from `tabUser Permission` where user="{0}" and allow="Employee" """.format(user),as_dict = True)
		curr_emp =[frappe.get_doc("Employee",user['for_value']).user_id for user in data]
		return curr_emp
	except frappe.DoesNotExistError as e:
		return []
	
def get_qa_lead():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	qa_lead = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
	return qa_lead if qa_lead else []


def get_production_tl():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Production TL" in frappe.get_roles(user["for_value"])]
	return users
	
		