# Copyright (c) 2024, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class MItemsConfiguration(Document):
	
	def validate(self):
		self.check_existing_records()
		
		# self.insert_mitem_values()
		

	# def on_trash(self):
	# 	self.remove_mitem_record()
	
	def insert_mitem_values(self):
		if frappe.db.exists("MItem Values", self.mitems):
			mitem_value_doc = frappe.get_doc("MItem Values", self.mitems)

			exclude_str = ','.join([item_1.mitem for item_1 in self.exclude])
			include_str = ','.join([item_2.mitem for item_2 in self.include])
			dependent_str = ','.join([item_3.mitem for item_3 in self.dependent])
			special_include_str = ','.join([item_4.mitem for item_4 in self.special_include])
			if len(mitem_value_doc.mitem_configuration) == 0:
				mitem_value_doc.append("mitem_configuration", {
					"mitem": self.mitems,
					"redroad_coder_response": self.redroad_coder_response,
					"exclude": exclude_str,
					"include": include_str,
					"special_include":special_include_str,
					"dependent": dependent_str
				})
				mitem_value_doc.save()
			
			else:
				updated = False
				for items in mitem_value_doc.mitem_configuration:
					if items.mitem == self.mitems and items.redroad_coder_response == self.redroad_coder_response:
						items.exclude = exclude_str
						items.include = include_str
						items.dependent = dependent_str
						items.special_include = special_include_str
						items.payor_type = self.payor_type
						items.assessment_type = self.assessment_type
						updated = True
						break

				if not updated:
					existing_item = next((item for item in mitem_value_doc.mitem_configuration if item.mitem == self.mitems and item.redroad_coder_response == self.redroad_coder_response), None)

					if existing_item:
						existing_item.exclude = exclude_str
						existing_item.include = include_str
						existing_item.dependent = dependent_str
						existing_item.special_include = special_include_str
						existing_item.payor_type = self.payor_type
						existing_item.assessment_type = self.assessment_type
					else:
						mitem_value_doc.append("mitem_configuration", {
							"mitem": self.mitems,
							"redroad_coder_response": self.redroad_coder_response,
							"exclude": exclude_str,
							"include": include_str,
							"dependent": dependent_str,
							"special_include": special_include_str,
							"payor_type": self.payor_type,
							"assessment_type": self.assessment_type
						})

				mitem_value_doc.save()

	def check_existing_records(self):
		if self.is_new():
			mitem_confg_record = frappe.db.exists("MItems Configuration", {"mitem_name": self.mitem_name, "redroad_coder_response": self.redroad_coder_response})

			if mitem_confg_record and self.redroad_coder_response:
				frappe.throw(
						msg='Configuration for Mitem Value <b> ' + self.mitem_name + '</b> with the coder response <b> ' + self.redroad_coder_response + '</b> is already present.',
						title='Cannot Create/Update Configuration',
					)
				
			if mitem_confg_record and not self.redroad_coder_response:
				frappe.throw(
						msg='Configuration for Mitem Value <b> ' + self.mitem_name +  '</b> is already present.',
						title='Cannot Create/Update Configuration',
					)

	
	def remove_mitem_record(self):
		if frappe.db.exists("MItem Values", self.mitems):
			mitem_value_doc = frappe.get_doc("MItem Values", self.mitems)
			
			for row in mitem_value_doc.mitem_configuration:
				if row.mitem == self.mitems and row.redroad_coder_response == self.redroad_coder_response:
					frappe.db.delete("MItems Configuration Table", {"mitem": row.mitem, "redroad_coder_response": row.redroad_coder_response})

		
			mitem_value_doc.save()

@frappe.whitelist()
def get_filtered_records(doctype, txt, searchfield, start, page_len, filters=None):
	return doctype

@frappe.whitelist()
def get_sub_values(parent):
	if parent:
		sub_values = []
		sub_values_list = frappe.db.get_list("MItems Values Tables", {'parent': parent}, ['sub_values'], ignore_permissions=True)
		if sub_values_list:
			for value in sub_values_list:
				sub_values.append(value['sub_values'])
		
		return sub_values