# Copyright (c) 2023, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import getdate,now
import itertools
from wms.public.py.notification  import has_role_profile





def execute(filters=None):
	columns, data = get_columns(), get_data(filters)

	summary = get_report_summary(data)
	skip_total_row = 1

	return columns, data,None,None,summary,skip_total_row


def get_columns():
	columns =  [				
		{"fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 150 },
		{"fieldname": "status", "label": _("Status"), "fieldtype": "Data","width": 80 },
		{"fieldname": "age_of_chart", "label": _("Chart Age"), "fieldtype": "Data","width": 80 },
		{'fieldname': 'view', 'label':('View Activity History'),'width': 60},
		{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data","width": 100 },
		{"fieldname": "sub_payor_type", "label": _("Payor Type"), "fieldtype": "Data","width": 100 },
		{"fieldname": "payor_type", "label": _("Payor Type (as per HCHB)"), "fieldtype": "Data","width": 100 },
		{"fieldname": "pdx", "label": _("PDX"), "fieldtype": "Data","width": 80 },
		{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Datetime","width": 190 },
		{"fieldname": "assigned_manager", "label": _("Assigned Production TL"), "fieldtype": "Data","width": 150 },
		{"fieldname": "assigned_to", "label": _("Assigned Coder"), "fieldtype": "Data","width": 150 },
		{"fieldname": "assigned_by", "label": _("Assigned QATL"), "fieldtype": "Data","width": 150 },
		{"fieldname": "email", "label": _("Assigned QA"), "fieldtype": "Data","width": 150 },
		{"fieldname": "workflow_state", "label": _("Chart Status"), "fieldtype": "Data","width": 150 },
		{"fieldname": "hold_reason", "label": _("Hold Reason"), "fieldtype": "Data","width": 150 },
		{"fieldname": "technical_issue", "label": _("Technical Issue"), "fieldtype": "Data","width": 150 },

		]
	if frappe.session.user != "Administrator" and has_role_profile(["QA Inventory Allocation","Production Inventory Allocation"]):
		columns.pop(3)
	return columns
	

def get_data(filters):
	conditions = ""

	join = f" LEFT JOIN "

	# wms 621
	# workflow status is null case
	custom_status = "CASE WHEN b.assigned_to IS NULL THEN 'Pending Assignment to Coder' \
						WHEN m.workflow_state IS NULL THEN 'Not Started'\
						WHEN m.workflow_state = 'Draft' THEN 'In-Progress'\
						ELSE m.workflow_state END AS workflow_state"

	if filters.get("name"): conditions += f" AND b.name = '{filters.get('name')}' "

	if filters.get('workflow_state'):
		chart_status = tuple(map(lambda x: x.strip(),filters.get('workflow_state').split(",")))
		if len(chart_status) == 1:
			if chart_status[0] == "Pending Assignment to Coder":
				conditions += f''' AND (CASE 
            WHEN b.assigned_to IS NULL THEN 'Pending Assignment to Coder' 
            WHEN m.workflow_state IS NULL THEN 'Not Started'
			WHEN m.workflow_state = 'Draft' THEN 'In-Progress'
            ELSE m.workflow_state
        END = 'Pending Assignment to Coder')'''
			elif chart_status[0] == "Not Started":
				conditions += f''' AND (CASE 
            WHEN b.assigned_to IS NULL THEN 'Pending Assignment to Coder' 
            WHEN m.workflow_state IS NULL THEN 'Not Started'
			WHEN m.workflow_state = 'Draft' THEN 'In-Progress'
            ELSE m.workflow_state
        END = 'Not Started')'''

			else:	
				conditions += f" AND m.workflow_state = '{chart_status[0]}' "	
		else:
			conditions += f''' AND CASE 
			WHEN b.assigned_to IS NULL THEN 'Pending Assignment to Coder' 
			WHEN m.workflow_state IS NULL THEN 'Not Started'
			WHEN m.workflow_state = 'Draft' THEN 'In-Progress'
			ELSE m.workflow_state
		END IN {chart_status} '''
		

	
	from_date,to_date = filters.get("from_date"),filters.get("to_date")

	if from_date and to_date:
		if getdate(to_date) < getdate(from_date):
			frappe.msgprint("To Date can't be before From Date")
			return []
		from_date = from_date
		to_date = to_date
		conditions += f" AND CAST(b.creation as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("from and to",from_date,to_date)

	if from_date and not to_date:
		from_date = from_date
		to_date = getdate(now())
		conditions += f" AND CAST(b.creation as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("not to",from_date,to_date)

	if not from_date and to_date:
		from_date = getdate(frappe.get_last_doc('Bulk Upload Activities', order_by="creation asc").creation)
		to_date = to_date
		conditions += f" AND CAST(b.creation as DATE) BETWEEN '{from_date}' AND '{to_date}' "

		# print("not from",from_date,to_date)



	if filters.get("assessment_type"):conditions += f''' AND b.assessment_type = '{filters.get("assessment_type")}' '''
	
	if filters.get("payor_type"):conditions += f''' AND b.sub_payor_type = '{filters.get("payor_type")}' '''

	if filters.get("payor_type_hchb"):conditions += f''' AND b.payor_type = '{filters.get("payor_type_hchb")}' '''
		
	if filters.get("assigned_production_tl"):
		prod_tl = tuple(map(lambda x: x.strip(),filters.get('assigned_production_tl').split(",")))
		if len(prod_tl) == 1:
			conditions += f''' AND b.assigned_manager = '{prod_tl[0]}' '''
		else:
			conditions += f''' AND b.assigned_manager IN {prod_tl} '''


	if filters.get("assigned_coder"):
		medical_coder = tuple(map(lambda x: x.strip(),filters.get('assigned_coder').split(",")))
		if len(medical_coder) == 1:
			conditions += f''' AND b.assigned_to ='{medical_coder[0]}' '''
		else:
			conditions += f''' AND b.assigned_to IN {medical_coder} '''


	if filters.get("assigned_qatl"):
		qa_tl = tuple(map(lambda x: x.strip(),filters.get('assigned_qatl').split(",")))
		if len(qa_tl) == 1:
			conditions += f''' AND m.assigned_by ='{qa_tl[0]}' '''
		else:
			conditions += f''' AND m.assigned_by IN {qa_tl} '''


	if filters.get("assigned_qa"):
		qa = tuple(map(lambda x: x.strip(),filters.get('assigned_qa').split(",")))
		if len(qa) == 1:
			conditions += f''' AND m.email ='{qa[0]}' '''
		else:
			conditions += f''' AND m.email IN {qa} '''
		

	if filters.get("hold_reason"): conditions += f''' AND m.hold_reason  LIKE '%{filters.get("hold_reason")}%' '''
	if filters.get("technical_issue"): conditions += f''' AND m.technical_issue  LIKE '%{filters.get("technical_issue")}%' '''
	if filters.get("arrived_date"):conditions += f''' AND DATE(b.arrived_date) = '{filters.get("arrived_date")}' '''
	
	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
		if has_role_profile("Medical Coder"):
			conditions += f" AND b.assigned_to = '{frappe.session.user}' "

		if has_role_profile("Production TL"):
			conditions += f" AND b.assigned_manager = '{frappe.session.user}' "

		if has_role_profile("Operations Manager"):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" AND b.assigned_manager = '{production_tls[0]}' "
				else:
					conditions += f" AND b.assigned_manager IN {production_tls} "
			else:
				conditions += " AND b.assigned_manager = ' ' "

		if has_role_profile("Department Head"):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" AND b.assigned_manager = '{production_tls[0]}' "
				else:
					conditions += f" AND b.assigned_manager IN {production_tls} "
			else:
				conditions += " AND b.assigned_manager = ' ' "

			
			
			

	sql = f''' SELECT b.mr_number,b.status,CONCAT ('<button type="button" class="btn-outline-secondary"  onClick="view_work_allocation_history(\''', b.name ,\''')">View</button>') as view,b.assessment_type,b.age_of_chart, b.assigned_to,b.assigned_manager,b.payor_type,b.sub_payor_type,b.arrived_date,{custom_status},m.email,m.assigned_by,m.hold_reason,m.technical_issue, m.pdx from `tabBulk Upload Activities` b {join} `tabMedical Coder Flow` m ON  b.name = m.name \
		  WHERE b.name IS NOT NULL  {conditions}  ORDER BY b.creation DESC'''
	data = frappe.db.sql(sql,as_dict = True)

	return data

def get_report_summary(data):
	return [
			{
				"value": len(data),
				"label": "Total Work Allocation",
				"indicator": "Blue",			
			},			
		]


# NOTE
# exact copy of permission.py because of decoupling
@frappe.whitelist()
def get_medical_coders():
	if frappe.session.user == "Administrator"  or has_role_profile(["WMS Manager","Production Inventory Allocation","Super Admin"]):
		roles = 'Medical Coder'
		query = get_query(roles = roles)
		data = frappe.db.sql(query,as_list = 1)
		users = list(itertools.chain(*data))
		return "\n".join(users)
	
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Medical Coder" in frappe.get_roles(user["for_value"])]

	return "\n".join(users)

def get_production_tl():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Production TL" in frappe.get_roles(user["for_value"])]
	return users if users else []

@frappe.whitelist()
def get_assigned_qa():
	
	if has_role_profile(["QA Manager"]) and frappe.session.user != "Administrator" and not  has_role_profile(["WMS Manager","Super Admin"]):
		data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
		users = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
		return "\n".join(users)
	
	roles = 'QA'
	query = get_query(roles = roles)
	data = frappe.db.sql(query,as_list = 1)
	flat_list = list(itertools.chain(*data))
	return "\n".join(flat_list)

@frappe.whitelist()
def get_assigned_qatl():

	if has_role_profile(["QA Manager"]) and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
		data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
		users = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
		return "\n".join(users)
	

	roles = 'QA Lead'
	query = get_query(roles = roles)
	data = frappe.db.sql(query,as_list = 1)
	flat_list = list(itertools.chain(*data))
	return "\n".join(flat_list)


@frappe.whitelist()
def get_production_tl_list():
	if frappe.session.user == "Administrator" or has_role_profile(["WMS Manager","Production Inventory Allocation","Super Admin"]):
		roles = 'Production TL'
		query = get_query(roles = roles)
		data = frappe.db.sql(query,as_list = 1)
		users = list(itertools.chain(*data))
		return "\n".join(users)
	
	if has_role_profile("Medical Coder"):
		data = frappe.db.sql(f"select distinct(user) from `tabUser Permission` where for_value = '{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
		users =[user['user'] for user in data if "Production TL" in frappe.get_roles(user["user"])]
		return "\n".join(users)
	
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Production TL" in frappe.get_roles(user["for_value"])]
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


