# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from frappe import _
import frappe
import itertools
from frappe.utils import getdate,now
from wms.public.py.notification  import has_role_profile


def execute(filters=None):
	columns =  get_columns()	
	asset = get_data(filters)

	report_summary = get_report_summary(filters, columns, asset)

	return columns,asset,None,None,report_summary


def get_data(filters):
	conditions = ""

	if filters.get("mr_number"):conditions += f''' AND name = '{filters.get("mr_number")}' '''

	if filters.get("assessment_type"):conditions += f''' AND assessment_type = '{filters.get("assessment_type")}' '''

	if filters.get("payor_type"):conditions += f''' AND payor_type = '{filters.get("payor_type")}' '''

	if filters.get("payor_type_hchb"):conditions += f''' AND payor_type_hchb = '{filters.get("payor_type_hchb")}' '''

	if filters.get("assigned_production_tl"):
		production_tl = tuple(map(lambda x: x.strip(),filters.get('assigned_production_tl').split(",")))
		if len(production_tl) == 1:
			conditions += f''' AND team_lead ='{production_tl[0]}' '''
		else:
			conditions += f''' AND team_lead IN {production_tl} '''


	if filters.get("assigned_coder"):
		assigned_coder = tuple(map(lambda x: x.strip(),filters.get('assigned_coder').split(",")))
		if len(assigned_coder) == 1:
			conditions += f''' AND codername ='{assigned_coder[0]}' '''
		else:
			conditions += f''' AND codername IN {assigned_coder} '''


	if filters.get("assigned_qatl"):
		qa_tl = tuple(map(lambda x: x.strip(),filters.get('assigned_qatl').split(",")))
		if len(qa_tl) == 1:
			conditions += f''' AND assigned_by ='{qa_tl[0]}' '''
		else:
			conditions += f''' AND assigned_by IN {qa_tl} '''
		

	if filters.get("assigned_qa"):
		qa = tuple(map(lambda x: x.strip(),filters.get('assigned_qa').split(",")))
		if len(qa) == 1:
			conditions += f''' AND email ='{qa[0]}' '''
		else:
			conditions += f''' AND email IN {qa} '''

	if filters.get("hold_reason"):conditions += f''' AND hold_reason LIKE '%{filters.get("hold_reason")}%' '''

	if filters.get("technical_issue"):conditions += f''' AND technical_issue LIKE '%{filters.get("technical_issue")}%' '''

	if filters.get("arrived_date"):conditions += f''' AND DATE(arrived_date) = '{filters.get("arrived_date")}' '''


	
	from_date,to_date = filters.get("from_date"),filters.get("to_date")

	if from_date and to_date:
		if getdate(to_date) < getdate(from_date):
			frappe.msgprint("To Date can't be before From Date")
			return []
		from_date = from_date
		to_date = to_date
		conditions += f" AND CAST(creation_date as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("from and to",from_date,to_date)

	if from_date and not to_date:
		from_date = from_date
		to_date = getdate(now())
		conditions += f" AND CAST(creation_date as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("not to",from_date,to_date)

	if not from_date and to_date:
		from_date = getdate(frappe.get_last_doc('Bulk Upload Activities', order_by="creation asc").creation)
		to_date = to_date
		conditions += f" AND CAST(creation_date as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("not from",from_date,to_date)
	
	# conditions += f" AND CAST(creation_date as DATE) BETWEEN '{from_date}' AND '{to_date}' "

	# workflow_state = "CASE WHEN workflow_state = 'Draft' THEN 'In-Progress'\
	# 					ELSE workflow_state END AS workflow_state"
	
	workflow_state = 'workflow_state'
	
	if(filters.get('workflow_state')):
		chart_status = tuple(map(lambda x: x.strip(),filters.get('workflow_state').split(",")))
		if len(chart_status) == 1:
			conditions += f''' AND (CASE 
				WHEN workflow_state = 'Draft' THEN 'In-Progress'
				ELSE workflow_state
				END = '{chart_status[0]}') '''
		else:
			conditions += f''' AND CASE 
				WHEN workflow_state = 'Draft' THEN 'In-Progress'
				ELSE workflow_state
				END IN {chart_status} '''
	
		
	#data
	state_record = []

	if has_role_profile("QA Lead") and frappe.session.user != "Administrator" and  not  has_role_profile(["WMS Manager","Super User"]):
		mr_number = " CASE WHEN workflow_state in ('Pending Quality','Picked for Audit') THEN NULL ELSE mr_number END AS mr_number "

		name = " CASE WHEN workflow_state in ('Pending Quality','Picked for Audit') THEN name ELSE NULL END AS name "
	else:
		mr_number = " mr_number "
		name = " name "
	
	if has_role_profile("QA Inventory Allocation") and frappe.session.user != "Administrator" and  not  has_role_profile(["WMS Manager","Super User"]):
		conditions += f'''  AND   workflow_state NOT IN ('Clarification Required- Query 1',
														'Clarification Required- Query 2',
														'Clarification Required- Query 3',
														'Send to Medical Coder - Answer 1',
														'Send to Medical Coder - Answer 2',
														'Send to Medical Coder - Answer 3',
														'Draft')   
						'''

	

	ql_lead = get_qa_lead()
	
	sql = frappe.db.sql(f"""SELECT CONCAT ('<button type="button" class="btn-outline-secondary"  onClick="view_work_allocation_history(\''', name ,\''')">View</button>') as view,creation_date,assessment_type,payor_type,arrived_date,{mr_number},{name},codername,payor_type_hchb,assigned_by,team_lead,email,{workflow_state},employee,chart_status,hold_reason, technical_issue ,pdx FROM `tabMedical Coder Flow` WHERE name IS NOT NULL  {conditions} ORDER BY  creation_date DESC""",as_dict = True)

	for sub in sql:
		if has_role_profile(["Super Admin","QA Inventory Allocation"]):
			state_record.append(sub)	
		elif has_role_profile("WMS Manager") and sub['assigned_by']:
			state_record.append(sub)
		elif has_role_profile("QA Lead") and  sub['assigned_by'] == frappe.session.user:
			state_record.append(sub)		
		elif has_role_profile("QA") and  sub['email'] == frappe.session.user:
			state_record.append(sub)
		elif has_role_profile("QA Manager"):					
			if sub['assigned_by'] in ql_lead:
				state_record.append(sub)
		elif has_role_profile("Department Head"):					
			if sub['assigned_by'] in ql_lead:
				state_record.append(sub)	

					
	return 	state_record

def get_qa_lead():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	qa_lead = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
	return qa_lead



def get_columns():
	# pop condition is not work properly
	# therefore use seperate return
	if has_role_profile("QA Lead") and frappe.session.user != "Administrator"  and not has_role_profile(["WMS Manager","Super User"]):
		return [		
		{ "fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 150},
		{ "fieldname": "name", "label": _("Name"), "fieldtype": "Data","width": 100},
		{'fieldname': 'view', 'label':('View Activity History'),'width': 60},
		{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type_hchb", "label": _("Payor Type (as per HCHB)"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "pdx", "label": _("PDX"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Datetime", "width": 180 },
		{"fieldname": "team_lead", "label": _("Assigned Production TL"), "fieldtype": "Data", "width": 200 },	
		{"fieldname": "codername", "label": _("Assigned Coder"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "assigned_by", "label": _("Assigned QATL"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "email", "label": _("Assigned QA"), "fieldtype": "Data", "width": 200 },		
		{"fieldname": "workflow_state", "label": _("Chart Status"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "hold_reason", "label": _("Hold Reason"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "technical_issue", "label": _("Technical Issue"), "fieldtype": "Data", "width": 150 },
	]
	else:
		columns =  [		
		{ "fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 150},
		{'fieldname': 'view', 'label':('View Activity History'),'width': 60},
		{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type_hchb", "label": _("Payor Type (as per HCHB)"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "pdx", "label": _("PDX"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Datetime", "width": 180 },
		{"fieldname": "team_lead", "label": _("Assigned Production TL"), "fieldtype": "Data", "width": 200 },	
		{"fieldname": "codername", "label": _("Assigned Coder"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "assigned_by", "label": _("Assigned QATL"), "fieldtype": "Data", "width": 200 },
		{"fieldname": "email", "label": _("Assigned QA"), "fieldtype": "Data", "width": 200 },		
		{"fieldname": "workflow_state", "label": _("Chart Status"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "hold_reason", "label": _("Hold Reason"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "technical_issue", "label": _("Technical Issue"), "fieldtype": "Data", "width": 150 },

		]
		if has_role_profile("QA Inventory Allocation"):
			columns.pop(1)
		return columns


		




def get_report_summary(filters, columns, asset):
	if has_role_profile(["QA Lead","QA","Operations Manager","Department Head","QA Manager","QA Inventory Allocation"]): 		
		return [
			{
				"value": len(asset),
				"label": "Total Work Allocation",
				"indicator": "Blue",			
			},			
		]
	
@frappe.whitelist()
def get_chartstatus_options():
	try:
		sql = " select distinct(state) from `tabWorkflow Document State` where parent = 'Medical Coder FLow Test' and \
		state not in  ('Draft','Chart Locked','Chart Locked - Error Corected by Coder','Chart Locked - Error Corected by QA','Chart Locked - Production Completed') \
			ORDER BY state "
		status = frappe.db.sql(sql, as_list = True)
		flat_list = list(itertools.chain(*status))
		return "\n".join(flat_list)
	except Exception as e:
		print(e)
		return []



@frappe.whitelist()	
def get_assiged_qa():
	if frappe.session.user == 'Administrator' or has_role_profile(["WMS Manager","QA Inventory Allocation","Super Admin"]):
		roles = 'QA'
		query = get_query(roles = roles)
		data = frappe.db.sql(query,as_list = 1)
		flat_list = list(itertools.chain(*data))
		return "\n".join(flat_list)
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	users = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
	

	return "\n".join(users)

@frappe.whitelist()
def get_medical_coder():
	roles = 'Medical Coder'
	query = get_query(roles = roles)
	data = frappe.db.sql(query,as_list = 1)
	
	flat_list = list(itertools.chain(*data))
	return "\n".join(flat_list)
		


@frappe.whitelist()
def get_production_tl():
	roles = 'Production TL'
	query = get_query(roles = roles)
	data = frappe.db.sql(query,as_list = 1)
	flat_list = list(itertools.chain(*data))
	return "\n".join(flat_list)
	

@frappe.whitelist()
def get_qa_tl():
	if frappe.session.user == 'Administrator' or has_role_profile(["WMS Manager","QA Inventory Allocation","Super Admin"]):
		roles = 'QA Lead'
		query = get_query(roles = roles)
		data = frappe.db.sql(query,as_list = 1)
		flat_list = list(itertools.chain(*data))
		return "\n".join(flat_list)
	
	if has_role_profile("QA"):
		emp_id = frappe.db.get_value('Employee', {"user_id":frappe.session.user}, 'name')
		data = frappe.db.sql(f"select distinct(user) from `tabUser Permission` where for_value = '{emp_id}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
		users =[user['user'] for user in data if "QA Lead" in frappe.get_roles(user["user"])]
		return "\n".join(users)
	
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	users = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]

	return "\n".join(users)


def get_query(roles = None):
	roles = roles
	query = f"""
			SELECT distinct(name)
			FROM tabUser 
			WHERE name IN (
			SELECT parent FROM `tabHas Role`
			WHERE role = '{roles}')
			and enabled = '1'  and name NOT IN (
			SELECT parent FROM `tabHas Role`
			WHERE role in ('System Manager','Super Admin','WMS Manager'))
			"""	
	
	return query


