# Copyright (c) 2023, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from wms.public.py.notification  import has_role_profile


class WorkAllocationActivityHistory(Document):
	pass

def upload_chart_status(doc,method):
	data  = frappe.db.get_value('Medical Coder Flow', doc.name, ['workflow_state'])
	if data in ["Production Completed"] and has_role_profile(["QA Inventory Allocation","Administrator"]):
		frappe.db.set_value(doc.doctype,doc.name,'work_flow_state',"Picked for Audit",update_modified=True)
	else:
		frappe.db.set_value(doc.doctype,doc.name,'work_flow_state',data,update_modified=True)
	doc.reload()