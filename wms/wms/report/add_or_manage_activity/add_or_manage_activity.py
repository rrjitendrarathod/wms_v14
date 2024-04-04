# Copyright (c) 2023, Manju and contributors
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
	conditions = " AND 1=1 "
	if(filters.get('mr_number')):conditions += f" AND mr_number = '{filters.get('mr_number')}'"
	if(filters.get('assigned_manager')):conditions += f" AND assigned_manager = '{filters.get('assigned_manager')}'"

	

	#data
	sql = frappe.db.sql(f"""SELECT creation_date,mr_number,patient_name,arrived_date,payor_type,assessment_type,assigned_manager,
		assigned_to  FROM `tabBulk Upload Activities` WHERE (creation_date BETWEEN '{_from}' AND '{to}') {conditions}""",as_dict=True)
	# return sql
	
	res = []
	user  = frappe.get_doc('User',frappe.session.user)
	if has_role_profile("Administrator"):
		for sub in sql:
			res.append(sub)
		return res
	if has_role_profile("WMS Manager"):
		for sub in sql:
			res.append(sub)
		return res
	if has_role_profile('Production TL'):		
		for sub in sql:
			if sub['assigned_manager'] == frappe.session.user:
				res.append(sub)		
		return res	
	if has_role_profile("Medical Coder"):
		for sub in sql:
			if sub['assigned_to'] == frappe.session.user:
				res.append(sub)
		return res


def get_columns():
	return [
		{ "fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 110 },
		{ "fieldname": "patient_name", "label": _("Patient Name"), "fieldtype": "Data","width": 110 },
		{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "assigned_manager", "label": _("Assigned Manager"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "assigned_to", "label": _("Assigned To"), "fieldtype": "Data", "width": 110 },			
	]

def get_report_summary(filters, columns, asset):
	assigned_to_me = 0

	user  = frappe.get_doc('User',frappe.session.user)

	if has_role_profile("Production TL"):
		for val in asset:		
			if val['assigned_manager'] == frappe.session.user:
				assigned_to_me += 1		
		return [
			{
				"value": assigned_to_me,
				"label": "Total",
				"datatype": "Data",
				"indicator": "Blue",			
			},
					
		]

	elif has_role_profile("Medical Coder"):
		for val in asset:		
			if val['assigned_to'] == frappe.session.user:
				assigned_to_me += 1		
		return [
			{
				"value": assigned_to_me,
				"label": "Total",
				"datatype": "Data",
				"indicator": "Blue",			
			},
					
		]