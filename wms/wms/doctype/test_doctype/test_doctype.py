# Copyright (c) 2024, Jitendra and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class TestDoctype(Document):
	
	@frappe.whitelist()
	def get_mitem_table_data(self):
		print("=====sssssssss=====")
		path = 'wms/wms/doctype/test_doctype/table.html'
		html=frappe.render_template(path,{'data':[]})
		return {'html':html}


