# Copyright (c) 2013, Manju and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from frappe.utils import flt, getdate, nowdate

def execute(filters=None):
	filters = frappe._dict(filters or {})
	columns = get_columns(filters)
	data = get_data(filters)
	return columns, data

def get_columns(filters):
	columns = [
		{
			"label": _("Modified by"),
			"fieldname": "modified_by",
			"width": 150
		},
		{
			"label": _("Version ID"),
			"fieldtype": "Link",
			"fieldname": "name",
			"options": "Version",
			"width": 150
		},
		{
			"label": _("Form/DocType"),
			"fieldname": "ref_doctype",
			"options": "DocType",
			"width": 150
		},
		{
			"label":_('Module'),
			"fieldname":'module',
			"fieldtype":"Data",
			"width":150
		},
		{
			"label": _("Modified Date"),
			"fieldname": "modified",
			"fieldtype": "Date",
			"width": 150
		},
		{
			"label":_("Field"),
			"fieldname":"field",
			"width":150
		},
		{
			"label":_("Old"),
			"fieldname":"old",
			"width":100
		},
		{
			"label":_("New"),
			"fieldname":"new",
			"width":100
		},
		{
			"label":_('Row Changed'),
			"fieldname":"child",
			"fieldtype":"Data",
			"width":300
		},
		{
			"label":_('Row Added'),
			"fieldname":"child1",
			"fieldtype":"Data",
			"width":300
		},

	]

	return columns

def get_conditions(filters):
	conditions = {}

	if filters.name:
		conditions["name"] = filters.name
		return conditions

	if filters.modified_by:
		conditions["modified_by"] = filters.modified_by
	
	return conditions

def get_data(filters):

	data = []

	conditions = get_conditions(filters)
	
	#data = frappe.db.sql("""select name , ref_doctype, modified_by, data  from `tabVersion` """.format(conditions), filters,as_list=1) 
	accounts = frappe.db.get_all("Version", fields=["name", "ref_doctype", "modified_by", "modified","data"],
	order_by='creation desc', 
		filters=conditions)
	for d in accounts:
		row = {"name": d.name, "ref_doctype": d.ref_doctype, "modified_by": d.modified_by, "modified": d.modified,"module":frappe.db.get_value('DocType',{'name':d.ref_doctype},'module')}
		
		fetch_value(frappe.parse_json(d.data),row,data)
		data.append(row)
			
	return data


def fetch_value(payload,row,data):
	if isinstance(payload.get('changed'),list) and (len(payload.get('changed')))>0:
		changed = payload.get('changed')
		for change in changed:
			row['field'] = frappe.db.get_value('DocField',{'parent':row['ref_doctype'],'fieldname':change[0]},'label')
			row['old'] = change[1]
			row['new'] = change[2]
		if (len(payload.get('row_changed')))>0 :
			row['child'] = frappe.as_json(dict(row_changed=payload.get('row_changed')))
		
	if isinstance(payload.get('added'),list)  and len(payload.get('added'))>0:
		added = []
		for r in payload.get('added'):
			added.append(r[1])
		row['child1']=frappe.as_json(dict(row_added=added))
		


