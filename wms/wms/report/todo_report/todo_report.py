# Copyright (c) 2023, Frappe Technologies and contributors
# For license information, please see license.txt

# import frappe


from __future__ import unicode_literals
from frappe import _
import frappe
from wms.public.py.notification  import has_role_profile

def execute(filters=None):
	columns =  get_columns()	
	asset = get_data(filters)	
	report_summary = get_report_summary(filters, columns, asset)	
	return columns,asset,None,None,report_summary 

def get_data(filters):	
	_from , to = filters.get('from'),filters.get('to')

	#conditions
	conditions = "AND 1=1"
	if(filters.get('mr_number')):conditions += f" AND t.mr_number = '{filters.get('mr_number')}' "
	if(filters.get('owner')):conditions += f" AND t.owner = '{filters.get('owner')}' "
	if(filters.get('assigned_by')):conditions += f" AND t.assigned_by = '{filters.get('assigned_by')}' "	
	if(filters.get('status')):conditions += f" AND t.status = '{filters.get('status')}' "	
	
	sql = frappe.db.sql(f"""SELECT "ToDo", t.name,t.status,t.mr_number,t.arrived_date,t.assessment_type,t.payor_type,m.chart_status,t.owner,
		m.hold_reason FROM `tabMedical Coder Flow` m RIGHT JOIN  `tabToDo` t ON t.mr_number = m.mr_number	WHERE (t.date BETWEEN '{_from}' AND '{to}')  {conditions}""",as_dict = True)
	
	res = []
	user  = frappe.get_doc('User',frappe.session.user)
	if frappe.session.user == "Administrator":
		res.append(sql)
	elif has_role_profile(["Medical Coder","QA Lead"]):
		for sub in sql:
			if sub['owner'] == frappe.session.user:
				res.append(sub)		
	return res

		
def get_columns():
	user  = frappe.get_doc('User',frappe.session.user)
	list_def =[{ "fieldname": "name", "label": _("ToDo ID"), "fieldtype": "Data", "width": 110 },
			{"fieldname": "status", "label": _("ToDo Status"), "fieldtype": "Data", "width": 180 },
			{"fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data", "width": 120 },
			{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Date", "width": 180 },
			{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 150 },
			{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 150 },
			{"fieldname": "chart_status", "label": _("Chart Status"), "fieldtype": "Data", "width": 150 },
			{"fieldname": "hold_reason", "label": _("Hold Reason"), "fieldtype": "Data", "width": 150 },			
			]
	if has_role_profile("QA Lead") and frappe.session.user != "Administrator":
		list_def.pop(2)
	return list_def

def get_report_summary(filters, columns, asset):
	closed_count = 0
	opened_count = 0
	cancelled = 0
	
	for val in asset:
		if val['status'] == "Closed":
			closed_count += 1
		elif val['status'] == "Open":
			opened_count += 1
		elif val['status'] == "Cancelled":
			cancelled += 1
	
	return [
		{
			"value": opened_count,
			"label": "Open ToDo",
			"datatype": "Data",
			"indicator": "Red",
			
		},
		{
			"value": closed_count,
			"label": "Closed ToDo",
			"datatype": "Data",
			"indicator": "Green",
			
		},
		{
			"value": cancelled,
			"label": "Cancelled ToDo",
			"datatype": "Data",
			"indicator": "Blue",
			
		},
		
	]


