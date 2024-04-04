# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class QAWorkAllocation(Document):

	# Time Stamp For QA work Allocation
	def validate(self):
		pass
		# time_diff=frappe.utils.data.time_diff(self.endtime,self.starttime)
		# self.timestamp=time_diff
