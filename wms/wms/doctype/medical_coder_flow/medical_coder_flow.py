# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import json
from datetime import datetime
# from frappe.utils import format_date,format_time,format_datetime,now,nowtime
from frappe.utils import format_date,format_time,format_datetime,now,get_url,get_url_to_list,has_common
from frappe.model.workflow import apply_workflow

from wms.public.py.notification  import make_system_notification,has_role_profile

from frappe.desk.form.assign_to import remove
from wms.public.py.user_data import create_todo

from wms.wms.doctype.bulk_upload_activities.bulk_upload_activities import (
    update_productiontl_history,
    update_medical_coder_history
)
from collections import deque
from wms.utils.common import decrement_activity_count

class MedicalCoderFlow(Document):
	def on_update(self):
		# when charstatus is chartlocked
		if self.workflow_state == "Chart Locked":
			self.final_chart_status_datetime = f"{now()} | {frappe.session.user}"
					
		# used to notify per user (wms-217)
		self.restricted_user_notified()
		# notify another qatl if assigned QATL changed
		self.notify_another_qatl()

		self.opm_user_notified()

		self.qam_user_notified()

		self.dh_user_notified()

		self.update_qa_email_and_name()

		# self.update_workallocation_history_on_qalead_assign()

		
		self.qatl_to_qa_reassignment_notifications()

		self.auto_update_assignTo_qa()

		self.create_qa_weightage_form()

		# self.update_in_hold_reason_wa_history()
		
		self.update_qa_weightage()

		self.update_activity_history()

	def onload(self):
		self.check_form_permission()

		
	def update_qa_weightage(self):
		if frappe.db.exists('QA Weightage', {'medical_coder_flow': self.name}):
			if self.email and self.employee and self.get_doc_before_save():
				if self.get_doc_before_save().email != self.email:
					frappe.db.set_value('QA Weightage', {'medical_coder_flow': self.name}, 'qa', self.email)

						
	def check_form_permission(self):
		# during onload
		if has_role_profile("QA Lead") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.assigned_by:
				assigned = f"Restricted Access:"
				frappe.throw(f"{assigned} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
		
		if has_role_profile("QA") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.email:
				assigned = f"Restricted Access:"
				frappe.throw(f"{assigned} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
				
		if has_role_profile("QA Inventory Allocation") and not has_role_profile(["WMS Manager","Super Admin"]):
			if self.workflow_state not in ["Production Completed","Picked for Audit"]:
				message = f"Restricted Access - Record must be in <b>Production Completed/ Picked For Audit</b> Chart Status"
				frappe.throw(f"{message} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
				
		if has_role_profile("Medical Coder") and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.codername:
				message = f"Restricted Access:"
				frappe.throw(f"{message} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
	
	def update_in_hold_reason_wa_history(self):
		if self.get_doc_before_save()  and self.get_doc_before_save().hold_reason != self.hold_reason and self.get_doc_before_save().hold_reason and frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
			wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)
			wah.append("wa_history",{
						"activity":f"Hold Reason removed:{self.get_doc_before_save().hold_reason}",
						"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
						"user" : frappe.session.user
					})
			wah.save(ignore_permissions=True)
			wah.reload()

		if self.hold_reason  and frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
			wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)

			# print("qa inventry",self.workflow_state,len(self.qa_lead_assign_table))
			wah.append("wa_history",{
						"activity":f"Hold Reason added:{self.hold_reason}",
						"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
						"user" : frappe.session.user
					})
			wah.save(ignore_permissions=True)
			wah.reload()
		


	def before_save(self):
		
		self.update_production_date_time()
		self.check_qa_lead_before_reassign()
		self.update_workallocation_history()
		self.check_duplicates_in_child_table()
		self.update_qalead_reassign_table()
		# self.update_combine_mitem_table()
		self.update_rebutal_status()
		# In Child Table Checking the duplicate Mitems in Medical Coder and QA 
		# self.check_duplicate_items("oasis_item", "OASIS Item")		
		# self.check_duplicate_items("qa_table", "QA OASIS Item")
		self.delete_qa_weightage_based_on_no()
		self.cancel_qa_weightage_based_on_error()
		self.adding_values_into_icd_code()
		self.clear_all_fields_error_marked_no()
		self.update_hold_reason_table()
		self.mitems_table_validation()
		self.clear_values_based_on_error_marked()
		self.delete_row_oasis_item()

		if self.status == "Inactive":
			frappe.throw(msg=f"You can't save the form {self.name} Bcz status is <b>Inactive</b>")
	
	def check_duplicate_items(self, field_name, field_label):
		encountered_items = []
		duplicate_items = []

		for row in self.get(field_name):
			item = row.get("oasis_items") if field_name == "oasis_item" else row.get("qa_mitem")

			if item in encountered_items:
				duplicate_items.append(item)
			else:
				encountered_items.append(item)

		if duplicate_items:
			frappe.throw(_("Duplicate <b>{0}</b> are not allowed: <b>{1}</b>".format(field_label, ", ".join(duplicate_items))))


	def update_production_date_time(self):
		if self.workflow_state == 'Production Completed':
			self.production_completed_date = now()

		if self.workflow_state == "Picked for Audit" or self.workflow_state == "Pending Quality":
			self.audit_date = now()

	def opm_user_notified(self):
		user = ""
		role_profile = ""		
		# operation manager
		if self.workflow_state == "Draft":
			role_profile = "Operations Manager"
			user = self.codername
			# coder_name from coder work flow

		if role_profile and user:
			sql = f"select up.user,up.for_value,u.user_id as user_name,u.role from `tabUser Permission` up inner join `tabEmployee` u  on up.user = u.user_id where up.for_value = '{user}' and u.role = '{role_profile}'"
			users = frappe.db.sql(sql,as_dict = True)
			usr_list = [user.user_name for user in users]
			if usr_list and not self.opm_email:
				self.opm_email = usr_list[0]

	def qam_user_notified(self):
		user = ""
		role_profile = ""	
		if self.workflow_state == "Pending Quality":
			role_profile = "QA Manager"
			user = self.employee
		
		if role_profile and user:
			sql = f"select up.user,up.for_value,u.user_id as user_name,u.role from `tabUser Permission` up inner join `tabEmployee` u  on up.user = u.user_id where up.for_value = '{user}' and u.role = '{role_profile}'"
			users = frappe.db.sql(sql,as_dict = True)
			usr_list = [user.user_name for user in users]
			if usr_list and not self.qam_email:
				frappe.db.set_value(self.doctype, self.name, 'qam_email', usr_list[0])
				self.reload()

	def dh_user_notified(self):
		user = ""
		role_profile = ""		
		# operation manager
		if self.workflow_state == "Draft":
			role_profile = "Department Head"
			user = self.team_lead
			# team_lead from work allocation

		if role_profile and user:
			sql = f"select up.user,up.for_value,u.user_id as user_name,u.role from `tabUser Permission` up inner join `tabEmployee` u  on up.user = u.user_id where up.for_value = '{user}' and u.role = '{role_profile}'"
			users = frappe.db.sql(sql,as_dict = True)
			usr_list = [user.user_name for user in users]
			if usr_list and not self.dh_email:
				self.dh_email = usr_list[0]

	def validate(self):
		self.validation_for_all_workflow_state()

		self.validate_pdx_special_character()

		self.remove_o_series_data()		

		self.validate_number_field("no_of_pages", "No of Pages")
		self.validate_number_field("no_of_pages_qa", "No of Pages QA")
		self.o_series_mitem_validation()
		self.remove_extra_added_icd_code_if_delete_select()
		self.validate_icd_codeqa_comments_mandatory()
		self.validate_oasis_item()
		

	def update_hold_reason_table(self):
		if self.get_doc_before_save()  and self.get_doc_before_save().hold_reason != self.hold_reason and self.get_doc_before_save().hold_reason:
			self.append("hold_reason_history1",{
							"hold_reason_name" : f"Remove Hold Reason:{self.get_doc_before_save().hold_reason}",
							"user":frappe.session.user,
							})

		if self.hold_reason:
			self.append("hold_reason_history1",{
							"hold_reason_name" : f"Hold Reason added:{self.hold_reason}",
							"user":frappe.session.user,
							})


	def remove_extra_added_icd_code_if_delete_select(self):
		icd_code = [row.icd for row in self.icd_code]
		qa_icd = []
		for row in self.icd_codeqa:
			if row.remove_icd=="Delete" and not row.is_diagnostics:
				pass
			else:
				qa_icd.append({'icd_qa':row.icd_qa, 'remove_icd':row.remove_icd, 'qa_comments':row.qa_comments, 'is_diagnostics':row.is_diagnostics})
		self.set("icd_codeqa", [])
		
		for row in qa_icd:
			self.append('icd_codeqa', row)

	def validate_icd_codeqa_comments_mandatory(self):
		if has_role_profile("QA"):
			mitems =  {}
			msg = ""
			title = "QA Comments Mandatory"
			for data in self.icd_code:
				mitems[data.icd] = data.idx
			
			for d in self.icd_codeqa:
				if d.icd_qa not in mitems and not d.qa_comments:
					msg += f"Row {d.idx} :  {d.icd_qa}" + "<br>"
				elif d.icd_qa in mitems and d.remove_icd=="Delete" and not d.qa_comments:
					msg += f"Row {d.idx} :  {d.icd_qa}" + "<br>"
			if msg:
				frappe.throw(msg=f"{msg} " ,title=f"{title}")

		
	def check_qa_lead_before_reassign(self):
		if self.workflow_state != "Picked for Audit" and has_role_profile(["QA Lead","Administrator"]):
			if self.get_doc_before_save().assigned_by != self.assigned_by:
				frappe.throw(msg=f"Work Allocation {self.name} not in Picked for Audit So You Cannot change QA TL")			

	# def update_combine_mitem_table(self):

	# 	if has_role_profile(["Medical Coder","QA"]):

	# 		combine_mitems_d = {}
	# 		self.combined_mitems = []
	# 		for data in self.oasis_item:
	# 			combine_mitems_d[data.oasis_items] = {
	# 				"oasis_items" : data.oasis_items,
	# 				"questions" : data.questions,
	# 				"clinical" :data.clinical,
	# 				"redroad_response" : data.redroad_response,
	# 				"reason_for_change" : data.reason_for_change
	# 			}

	# 		for data in self.qa_table:
	# 			if data.qa_mitem in combine_mitems_d:
	# 				combine_mitems_d[data.qa_mitem].update({
	# 					'red_road_qa_response':data.red_road_qa_response,
	# 					'qa_rationale': data.qa_rationale
	# 				})
	# 			else:
	# 				combine_mitems_d[data.qa_mitem] = {
	# 					'red_road_qa_response':data.red_road_qa_response,
	# 					'qa_rationale': data.qa_rationale,
	# 					"oasis_items" : data.qa_mitem,
	# 					"questions" : data.questions,
	# 				}

			
	# 		for combine_data in combine_mitems_d.values():
	# 			self.append("combined_mitems",combine_data)


	def update_qa_email_and_name(self):
		# user = frappe.get_doc("User",frappe.session.user)
		if has_role_profile(["QA Lead","Administrator"]) and self.employee:
			email, name = frappe.db.get_value('Employee', self.employee, ['user_id', 'employee_name'])
			frappe.db.set_value(self.doctype,self.name,'email',email,update_modified=False)
			frappe.db.set_value(self.doctype,self.name,'assign_to_name',name,update_modified=False)
			self.reload()

			if self.workflow_state in ["Picked for Audit"]:
				user_list = [email]
				message = f"{self.mr_number} - Pending Quality"
				subject = "Work Allocation"
				make_system_notification(user_list, message,self.doctype,self.name,subject)


	def update_workallocation_history_on_qalead_assign(self):
		user = frappe.get_doc("User",frappe.session.user)
		if self.workflow_state in ["Production Completed"]  \
								and has_role_profile(["QA Inventory Allocation"]) and not(self.get_doc_before_save().hold_reason != self.hold_reason) and self.get_doc_before_save().codername == self.codername:
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
				wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)

				# print("qa inventry",self.workflow_state,len(self.qa_lead_assign_table))
				wah.append("wa_history",{
							"activity":"Picked for Audit",
							"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
							"user" : frappe.session.user
						})
				
				wah.append("wa_history",{
							"activity":"WMS QA Work Allocation assigned",
							"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
							"user" : self.assigned_by
						})
					
				wah.save(ignore_permissions=True)
				wah.reload()

		if self.workflow_state in ["Picked for Audit"] \
								and has_role_profile(["QA Inventory Allocation"]) and not(self.get_doc_before_save().hold_reason != self.hold_reason):
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
				wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)
				# print("qa inventry",self.workflow_state,len(self.qa_lead_assign_table))
				if len(self.qa_lead_assign_table)> 1:
					wah.append("wa_history",{
							"activity" : "Assign to Another QA Lead",
							"milestones": format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
							"user" : self.assigned_by
						})	
				
					wah.save(ignore_permissions=True)
					wah.reload()


		if self.workflow_state in ["Picked for Audit","Pending Quality"] \
							and has_role_profile(["QA Lead","Administrator"]) :
			
			
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
				wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)
				
				if self.email and self.get_doc_before_save().email != self.email:
					
					wah.append("wa_history",{
								"activity":"QA Lead Assign To",
								"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
								"user" : self.email
							})
					# when assign to qa pick qaulity is not update therefore
					if len(self.qa_reassign_table) == 1:
						wah.append("wa_history",{
								"activity":"Pending Quality",
								"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
								"user" : frappe.session.user
							})

					# cancel notification qatl to qa reassign
					if self.get_doc_before_save().email:
						message = f"{self.mr_number} - Your assignment has been removed"
						user_list = [self.get_doc_before_save().email]
						subject = "Work Allocation Reassigned"
						make_system_notification(user_list, message,self.doctype,self.name,subject)
				
				if self.assigned_by and self.get_doc_before_save().assigned_by != self.assigned_by:
					wah.append("wa_history",{
								"activity":"Assign To Another QA Lead",
								"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
								"user" : self.assigned_by
							}) 

				
				wah.save(ignore_permissions=True)
				wah.reload()

		if self.workflow_state in ["Chart Locked"] and has_role_profile("Production TL"):
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
				wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)
				wah.append("wa_history",{
								"activity":self.workflow_state,
								"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
								"user" : frappe.session.user
							})
				
				wah.save(ignore_permissions=True)
				wah.reload()

	def update_qalead_reassign_table(self):
		user = frappe.get_doc("User",frappe.session.user)
		# qa reassign
		if self.workflow_state in ["Coder Error Rejected by L1 supervisor - 1st Level Appeal","Picked for Audit"] and has_role_profile(["QA Lead","Administrator"]):
			# print("update qa lead reassign")
			if self.get_doc_before_save().employee != self.employee:
				
				self.append("qa_reassign_table",{
								"qa_lead":frappe.session.user,
								"datetime":now(),
								"qa":self.email,
								"workflow_state":self.workflow_state
							})
				
				
		# qa lead reassign
		if self.workflow_state == "Picked for Audit" and has_role_profile(["QA Lead","Administrator"]):
			if self.get_doc_before_save().assigned_by != self.assigned_by:
		
				self.append("qa_lead_assign_table",{
									"assigned_by":frappe.session.user,
									"assigned_to":self.assigned_by,
									"datetime":now(),
									"workflow":self.workflow_state
								})
				
		
	def check_duplicates_in_child_table(self):
		if has_role_profile("Medical Coder"):
			self.check_duplicates("sticky_notes_table","first_diagnostics","Sticky Notes","Sticky Notes Table")

		if has_role_profile("QA"):
			self.check_duplicates("icd_codeqa","icd_qa","ICD CodeQA","ICD Code QA")
	
	def check_duplicates(self,table,table_field,message,title):
		duplicates = {}
		msg = ""
		for i, value in enumerate(self.get(table)):

			duplicates[value.get(table_field).strip().lower()] = duplicates[value.get(table_field).strip().lower()] + [i+1] if value.get(table_field).strip().lower() in duplicates else [i+1]
			
		for key,value in duplicates.items():
			if len(value) > 1:
				msg += f"{key} : ({','.join(map(str,value))}) " + "<br>"

		if msg:
			frappe.throw(msg=f"Duplicate ICD Codes Found in {message}: <br>{msg} " ,title=f"{title}")
		# else:
		# 	frappe.msgprint(msg=f"Duplicate ICD Codes Found in {message}: <br>{msg} " ,title=f"{title}")



		

	def notify_another_qatl(self):
		user = user = frappe.get_doc("User",frappe.session.user)
		if self.workflow_state in ["Picked for Audit","Coder Error Rejected by L1 supervisor - 1st Level Appeal"] and has_role_profile(["QA Lead","Administrator"]):
			if self.get_doc_before_save().assigned_by != self.assigned_by and frappe.db.exists("User",self.assigned_by):
				# -------------------------remove user-----------------------------
				remove(self.doctype, self.name, self.get_doc_before_save().assigned_by)
			
				user_list = [self.assigned_by]
				args = {
							"assign_to": [self.assigned_by],
							"doctype": self.doctype,
							"name": self.name,
							"description": "Assign to Another QATL",
							"assignment_rule":""
					}
				# ------------share another QATL-----------------------
				frappe.share.add(self.doctype, self.name, self.assigned_by)

				create_todo(self.assigned_by,args,user)
				# --------------------------notification-------------------
				# trigger from notification UI
					
				# message = f"{self.get_doc_before_save().assigned_by} has assigned {self.name} to you"
				# subject = "Work Allocation Assigned"
				# make_system_notification(user_list, message, self.doctype, self.name,subject)
				# frappe.msgprint(msg=f"Assigned a new task {self.name} to {self.assigned_by}",title='Assigned QATL')
				
					

	def qatl_to_qa_reassignment_notifications(self):
		user = frappe.get_doc("User",frappe.session.user)
		if self.workflow_state not in ["Picked for Audit"]  and has_role_profile(["QA Lead","Administrator"]):
			if self.get_doc_before_save().email != self.email and frappe.db.exists("User",self.email):
				user_list = [self.email]
				message = f"{self.mr_number} - {self.workflow_state}"
				subject = "Work Allocation"
				make_system_notification(user_list, message,self.doctype,self.name,subject)


	def update_workallocation_history(self):	
		if self.chart_status == "In-Progress":
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
				wah = frappe.get_doc("Work Allocation Activity History",self.patient_reference_details)
				
				self.work_allocation_activity_history = wah.name

	# need to rework as userprofile is not there
	def restricted_user_notified(self):
		user = ""
		role_profile = ""
		
		# qa manager
		if self.workflow_state == "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal" or self.workflow_state == "Coder Error Rejected  by L2 supervisor - 1st Level Appeal" or self.workflow_state == "QA Appeal":
			role_profile = "QA Manager"
			user = self.employee
			# done by l1 level employee (only employee) (assign_to)
			
		# department head
		elif self.workflow_state=="QA Error Rejected by QA Manager":
			role_profile = "Department Head"
			user = self.codername
			# coder_name or assign_to from coderwork flow?
			# both employee and user 

		# operation manager
		elif self.workflow_state == "Coder 2nd Level Appeal" or self.workflow_state == "Coder Error Rejected  by L1 supervisor-Post QA TL Feedback":
			role_profile = "Operations Manager"
			user = self.codername
			# coder_name from coder work flow

		if role_profile and user:
			sql = f"select up.user,up.for_value,u.user_id as user_name,u.role from `tabUser Permission` up inner join `tabEmployee` u  on up.user = u.user_id where up.for_value = '{user}' and u.role = '{role_profile}'"
			users = frappe.db.sql(sql,as_dict = True,debug = 1)

			usr_list = [user.user_name for user in users]
			
			subject = "Medical Coder Flow Error"
			message = f"{self.mr_number} - {self.workflow_state}"

			make_system_notification(usr_list,message,self.doctype,self.name,subject)

	def auto_update_assignTo_qa(self):
		user = frappe.get_doc("User",frappe.session.user)

		if self.workflow_state in ["Production Completed"] and has_role_profile(["QA Inventory Allocation","Administrator"]):
			if self.assigned_by:
				doc = frappe.get_doc(self.doctype,self.name)
				action = "Assigned to QA Lead"
				apply_workflow(doc,action)
		elif self.workflow_state in ["Picked for Audit"] and has_role_profile(["QA Lead","Administrator"]):
			if self.employee:
				doc = frappe.get_doc(self.doctype,self.name)
				action = "Assigned to QA"
				apply_workflow(doc,action)
	
	def update_rebutal_status(self):
		
		if self.workflow_state == "Error Corrected by Coder":
			self.rebutal_status = "Coder Error"

		elif self.workflow_state == "Error Corrected by QA":
			self.rebutal_status =  "QA Error"

	def delete_qa_weightage_based_on_no(self):
		if self.error_marked == "No" and has_role_profile("QA"):
			qa_records = frappe.get_all("QA Weightage", filters={"medical_coder_flow": self.name}, fields=["name", "docstatus"])
			records_to_delete = []
			for qa_record in qa_records:
				if qa_record.docstatus == 1:
					frappe.db.set_value("QA Weightage", qa_record.name, "docstatus", 2)
				records_to_delete.append(qa_record.name)
			frappe.delete_doc("QA Weightage", records_to_delete, ignore_permissions=True)
	
	def cancel_qa_weightage_based_on_error(self):
		if (self.workflow_state == 'QA Error Accepted by QA TL' and self.accept_error_from_qa_lead == "Yes"):
			qa_records = frappe.get_all("QA Weightage",filters={"medical_coder_flow": self.name},fields=["name", "docstatus"])
			for qa_record in qa_records:
				if qa_record['docstatus'] == 1:
					frappe.db.set_value("QA Weightage", qa_record.name, "docstatus", 2)


	def create_qa_weightage_form(self):
		if self.workflow_state == "No Error" and has_common(["QA", 'System Manager'], frappe.get_roles(frappe.session.user)):
			qa_weightage = frappe.new_doc("QA Weightage")
			qa_weightage.naming_series = "QWB.####"
			qa_weightage.medical_coder_flow = self.name

			# Define default scores
			scores = {
				"coding_weight__points": '41.00',
				"coding_score": '100.00',
				"oasis_weight__points": '57.00',
				"oasis_score": '100.00',
				"coordination_note_points": '2.00',
				"coordination_note_score": '100.00'
			}

			if self.payor_type in ["Managed - Medicare", "Managed - Medicaid", "Medicaid", "Medicare"] and self.assessment_type in ["Followup", "Recert", "SOC", "SCIC"]:
				# Set scores for the first condition
				scores = {
					"coding_weight__points": '41.00',
					"coding_score": '100.00',
					"oasis_weight__points": '57.00',
					"oasis_score": '100.00',
					"coordination_note_points": '2.00',
					"coordination_note_score": '100.00'
				}

			elif self.payor_type == "Commercial" and self.assessment_type in ["SOC", "Recert", "SCIC", "Followup"]:
				# Set scores for the second condition
				scores = {
					"coding_weight__points": '84.00',
					"coding_score": '100.00',
					"oasis_weight__points": '10.00',
					"oasis_score": '100.00',
					"coordination_note_points": '6.00',
					"coordination_note_score": '100.00'
				}

			elif self.payor_type in ["Commercial", "Medicare", "Managed - Medicaid", "Managed - Medicare", "Managed - Medicare - APM", "Medicaid"] and self.assessment_type == "ROC":
				# Set scores for the third condition
				scores = {
					"coding_weight__points": '38.00',
					"coding_score": '100.00',
					"oasis_weight__points": '60.00',
					"oasis_score": '100.00',
					"coordination_note_points": '2.00',
					"coordination_note_score": '100.00'
				}

			if (self.payor_type in ["Managed - Medicare", "Managed - Medicaid", "Medicaid", "Medicare"] and
				self.assessment_type in ["Followup", "Recert", "SOC", "SCIC"]):
				fields_to_na_and_readonly = ["q9", "q10", "q14"]
				set_fields_to_na_and_read_only(qa_weightage, fields_to_na_and_readonly)

			if (self.payor_type in ["Commercial", "Others"] and
				self.assessment_type in ["Followup", "Recert", "SOC", "SCIC"]):
				a = 42
				field_names = ["q" + str(i) for i in range(8, a)]
				set_fields_to_na_and_read_only(qa_weightage, field_names)

			# Assign scores to the fields in qa_weightage
			qa_weightage.coding_weight__points = scores["coding_weight__points"]
			qa_weightage.coding_score = scores["coding_score"]
			qa_weightage.oasis_weight__points = scores["oasis_weight__points"]
			qa_weightage.oasis_score = scores["oasis_score"]
			qa_weightage.coordination_note_points = scores["coordination_note_points"]
			qa_weightage.coordination_note_score = scores["coordination_note_score"]
			qa_weightage.oasis = "No"

			qa_weightage.insert(ignore_permissions=True)
			qa_weightage.submit()

			return qa_weightage

	def adding_values_into_icd_code(self):
		if has_role_profile("Medical Coder"):
			self.icd_code = []
			if len(self.sticky_notes_table) > 0:
				for notes in self.sticky_notes_table:
					self.append("icd_code", {"icd": notes.first_diagnostics})

				if  self.workflow_state in [
												"Draft",
												"Production Completed",
												"Clarification Required- Query 1",
												"Clarification Required- Query 2",
												"Clarification Required- Query 3",
												"Send to Medical Coder - Answer 1",
												"Send to Medical Coder - Answer 2",
												"Send to Medical Coder - Answer 3",
											]:
										
					self.icd_codeqa = []
					for notes in self.sticky_notes_table:
						self.append("icd_codeqa", {"icd_qa": notes.first_diagnostics, "is_diagnostics":1})

	def clear_all_fields_error_marked_no(self):
		if self.error_marked == "No" or self.error_marked == '':
			field_operations = {
				"pdpc_qa": '',
				"pdx_qa": '',
				"no_of_pages_qa": '',
				"pdpc_qa_comments": '',
				"pdx_qa_comments": '',
				"no_of_pages_qa_comments": '',
				"qa_table": '',
				"symptom_control_rating_qa_comments": '',
				"onsetexacerbation_qa_comments": '',
				"type_qa_comments": '',
				"onsetexacerbation_qa": '--Select any one from the list--',
				"type_qa": '--Select any one from the list--',
				"symptom_control_rating_qa": '--Select any one from the list--',
				"check_for_o_series_mitems": 0,
				"qact": 0,
				"qart": 0,
				"qaot": 0,
				"qanone": 0
			}

			for field, default_value in field_operations.items():
				self.set(field, default_value)

	def remove_o_series_data(self):
		field_list = ["cancer_treatments", "respiratory_therapies", "other", "none_of_the_above"]
		reason_for_change = ["rt_mitems", "none_mitems", "ct_mitems", "ot_mitems"]
		field_labels = {
			"cancer_treatments": "Cancer Treatment",
			"respiratory_therapies": "Respiratory Therapies",
			"other": "Other",
			"none_of_the_above": "None of the above"
		}

		# Check if cko is checked and field_list is not checked
		if self.cko == 1 and all(getattr(self, cb) == 0 for cb in field_list):
			frappe.throw(f"Mandatory Fields required in O: Special Treatment, Procedures and Programs<br><br><b>At least one of the below should be checked:</b><br><ul><li>{'</li><li>'.join(field_labels.values())}</ul>")
			frappe.validated = False

		if self.cko == 0:
			# Clear reason_for_change and uncheck field_list
			for cb, reason in zip(field_list, reason_for_change):
				setattr(self, cb, 0)
				setattr(self, reason, '')

		unchecked_fields = [cb for cb, index in zip(field_list, range(len(field_list))) if getattr(self, cb) == 1 and len(getattr(self, reason_for_change[index])) == 0]
		unchecked_fields_html = [f"&#8226; {field_labels[cb]}" for cb in unchecked_fields]

		if unchecked_fields_html:
			frappe.throw(f"Mandatory Fields required in O: Special Treatment, Procedures and Programs<br><br>{'<br>'.join(unchecked_fields_html)}<br><br>Please fill the Mitems")
			frappe.validated = False

	def validation_for_all_workflow_state(self):
		if has_role_profile("QA") and self.workflow_state == "Pending Quality":
			fields_to_check = [
				("pdpc", "pdpc_qa", "PDPC(QA)"),
				("pdx", "pdx_qa", "PDX(QA)"),
				("no_of_pages", "no_of_pages_qa", "No of Pages(QA)"),
				# ("type", "type_qa", "Type(qa)"),
				# ("onsetexacerbation", "onsetexacerbation_qa", "Onset/Exacerbation(QA)"),
				# ("symptom_control_rating", "symptom_control_rating_qa", "Symptom Control Rating(QA)")
			]

			for field, qa_field, label in fields_to_check:
				field_value = getattr(self, field, None)
				qa_field_value = getattr(self, qa_field, None)				
				if field_value and qa_field_value and field_value != '--Select any one from the list--' and field_value == qa_field_value:
					frappe.throw(_(f"Please enter Different Value in <b>{label}</b> before proceeding"))

	
	def validate_pdx_special_character(self):
		import re
		pdx_value = self.pdx or ''
		pdx_qa_value = self.pdx_qa or ''
		regex = re.compile(r'[^a-zA-Z0-9.-]+')
		error_messages = {
			# len(pdx_value) > 3 or len(pdx_value) < 8: ('PDX: Length should be between 3 and 8 characters', 'pdx'),
			# len(pdx_qa_value) > 3 or len(pdx_value) < 8: ('PDX(QA): Length should be between 3 and 8 characters', 'pdx_qa'),
			bool(regex.search(pdx_value)): ('PDX: Only alphanumeric characters are allowed.', 'pdx'),
			bool(regex.search(pdx_qa_value)): ('PDX(QA): Only alphanumeric characters are allowed.', 'pdx_qa')
		}

		for condition, (message, field) in error_messages.items():
			if condition:
				frappe.throw(_(f" <b>{message}</b>"))


	def validate_number_field(self,fieldname, field_label):
		field_value = self.get(fieldname)
		if field_value and not field_value.isdigit():
			frappe.throw(_(f"<b>{field_label}</b>: Only numbers are allowed."), title=_(f"Warning"))


	def mitems_table_validation(self):
		if has_role_profile("Medical Coder"):
			for values in self.oasis_item:
				if values.oasis_items and values.questions:
					if self.workflow_state in["Draft", "Send to Medical Coder - Answer 1",
											"Send to Medical Coder - Answer 2",
											"Send to Medical Coder - Answer 3"] and values.clinical and values.redroad_response and values.clinical == values.redroad_response:
						frappe.throw(_("Clinical and RedRoad Response have the same value with MItem Number <b>{0}</b>").format(values.oasis_items))

					if (values.clinical and not values.redroad_response) or (not values.clinical and values.redroad_response):
						frappe.throw(_("Please Enter the value in clinical or RedRoad Response with MItem Number <b>{0}</b>").format(values.oasis_items))

					if values.clinical is not None and values.redroad_response is not None and values.clinical != "" and values.redroad_response != "" and (values.reason_for_change is None or not values.reason_for_change):
						frappe.throw(_("Please Fill the Reason For Change with MItem Number <b>{0}</b>").format(values.oasis_items))

					if values.reason_for_change and not (values.clinical or values.redroad_response):
						frappe.throw(_("Please Enter the Values in the Clinical or RedRoad Response field with MItem Number <b>{0}</b>").format(values.oasis_items))
					
		elif has_role_profile("QA"):
			if self.error_marked == "Yes":
				for qavalues in self.oasis_item:
					if qavalues.oasis_items and qavalues.questions:
						if self.workflow_state == "Pending Quality" and qavalues.redroad_response and qavalues.qa_clinician_response and qavalues.redroad_response == qavalues.qa_clinician_response:
							frappe.throw(_("<b>Redroad Coder Response</b> and <b>Redroad QA Response</b> have the same value with MItem Number <b>{0}</b>").format(qavalues.oasis_items))

						if qavalues.qa_clinician_response and (not qavalues.qa_resason_for_change or qavalues.qa_resason_for_change is None or qavalues.qa_resason_for_change == ""):
							frappe.throw(_("Please Enter the value in <b>QA Rationale</b> with MItem Number <b>{0}</b>").format(qavalues.oasis_items))

						if qavalues.qa_resason_for_change and (qavalues.qa_clinician_response is None or qavalues.qa_clinician_response == ""):
							frappe.throw(_("Please Enter the value in <b>Redroad QA Response</b> with MItem Number <b>{0}</b>").format(qavalues.oasis_items))

						if qavalues.qa_resason_for_change and not (qavalues.qa_clinician_response):
							frappe.throw(_("Please Enter the Values in the Redroad QA Response field with MItem Number <b>{0}</b>").format(qavalues.oasis_items))
	# Making the fields empty
	def o_series_mitem_validation(self):
		check_box = ["qact", "qart", "qaot", "qanone"]
		fields_check_box = ["qact_mitems", "qart_mitems", "qaot_mitems", "qanone_mitems"]
		reason_for_change = ["rs_qact_mitems", "rs_qart_mitems", "rs_qaot_mitems", "rs_qanone_mitems"]

		# Check condition and set values accordingly
		if self.check_for_o_series_mitems == 0:
			for cb, reason_data, reason in zip(check_box, fields_check_box, reason_for_change):
				setattr(self, cb, 0)
				setattr(self, reason_data, '')
				setattr(self, reason, '')

		sum_val = self.cancer_treatments + self.respiratory_therapies + self.other

		if sum_val == 1 and self.cancer_treatments == 1 and self.qact == 1 and self.qart != 1 and self.qaot != 1:
			mc_value, qa_value = careot(self.qact_mitems, self.rt_mitems)
			mc_value.sort(),qa_value.sort()
			if mc_value == qa_value:
				frappe.throw('Please select different O M items')

		if sum_val == 1 and self.respiratory_therapies == 1 and self.qact != 1 and self.qart == 1 and self.qaot != 1:
			mc_value, qa_value = careot(self.none_mitems, self.qart_mitems)
			mc_value.sort(),qa_value.sort()
			if mc_value == qa_value:
				frappe.throw('Please select different O M items')

		if sum_val == 1 and self.other == 1 and self.qact != 1 and self.qart != 1 and self.qaot == 1:
			none_ot, none_ot = careot(self.ot_mitems, self.qanone_mitems)
			none_ot.sort(),none_ot.sort()
			if none_ot == none_ot:
				frappe.throw('Please select different O M items')

		if self.none_of_the_above == 1 and self.qanone == 1:
			none21qa, none22qa = careot(self.ot_mitems, self.qanone_mitems)
			none21qa.sort(),none22qa.sort()
			if none21qa == none22qa:
				frappe.throw('Please select different O M items')

		if sum_val == 2 and self.respiratory_therapies == 1 and self.other == 1 and self.qact != 1 and self.qart == 1 and self.qaot == 1:
			f11, f12, f13, f14 = careot(self.none_mitems, self.qart_mitems, self.qaot_mitems, self.ct_mitems)
			f11.sort(), f12.sort(), f13.sort(), f14.sort()
			if f11 == f12 and f13 == f14:
				frappe.throw('Please select different O M items')

		# qart && qact 
		if sum_val == 2 and self.cancer_treatments == 1 and self.respiratory_therapies == 1 and self.qact == 1 and self.qart == 1 and self.qaot != 1:
			f11, f12, f13, f14 = careot(self.qact_mitems, self.qart_mitems, self.rt_mitems, self.none_mitems)
			f11.sort(), f12.sort(), f13.sort(), f14.sort()
			if f11 == f13 and f12 == f14:
				frappe.throw('Please select different O M items')

		# qact && qart    
		if sum_val == 2 and self.cancer_treatments == 1 and self.other == 1 and self.qact == 1 and self.qaot == 1 and self.qart != 1:
			f11, f12, f13, f14 = careot(self.qact_mitems, self.qaot_mitems, self.rt_mitems, self.ct_mitems)
			f11.sort(), f12.sort(), f13.sort(), f14.sort()
			if f11 == f13 and f12 == f14:
				frappe.throw('Please select different O M items')

		if(sum_val == 3 and self.cancer_treatments == 1 and self.respiratory_therapies == 1 and self.other == 1 and self.qact == 1 and self.qart == 1 and self.qaot == 1):
			f11, f12, f13, f14, f15, f16 = careot(self.rt_mitems, self.qact_mitems, self.none_mitems,self.qart_mitems, self.ct_mitems, self.qaot_mitems)
			f11.sort(), f12.sort(), f13.sort(), f14.sort(), f15.sort(), f16.sort()
			if f11 == f12 and f13 == f14 and f15 == f16:
					frappe.throw('Please select different O M items')
	
	def after_insert(self):
		frappe.db.sql(""" update `tabBulk Upload Activities` set activity_status = "In Progress"  where name= "{0}" """.format(self.name))

	#Oasis Child Table Configuration
	def validate_oasis_item(self):
		if (self.is_new() or self.workflow_state in ["Draft"] or 
	  		(self.workflow_state == "Error Marked By QA" and self.coder_accept_error_from_qa == "Yes") or 
			(self.workflow_state == "QA Error Accepted by QA TL" and self.accept_error_from_qa_lead == "Yes") or 
			(self.workflow_state == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal" and self.error_based_on_feedback_received2 == "Yes") or 
			(self.workflow_state == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback" and self.accept_error_two == "Yes") or 
			(self.workflow_state == "Pending Quality" and self.error_marked == "Yes")):

			if self.oasis_item:
				mitems = []
				clinical_response = {}
				redroad_response = {}
				for row in self.oasis_item:
					if row.clinical and row.redroad_response:
						mitems.append(row.oasis_items)
						clinical_response[row.oasis_items] = row.clinical
						redroad_response[row.oasis_items] = row.redroad_response
				
				if not mitems:
					return

				for row in self.oasis_item:
					missing_item = []
					mitem_confg_doc = None
					conditions = [
						{"mitem_name": row.get('oasis_items'), "redroad_coder_response": row.get("redroad_response")},
						{"mitem_name": row.get('oasis_items'), "redroad_coder_response": None or ''}
					]

					for condition in conditions:
						if frappe.db.exists('MItems Configuration', condition):
							mitem_confg_doc = frappe.get_doc('MItems Configuration', condition)
							if mitem_confg_doc:
								break

					if not mitem_confg_doc:
						continue

					exclude = [value.mitem for value in mitem_confg_doc.exclude]
					include = [value.mitem for value in mitem_confg_doc.include]
					dependent = [value.mitem for value in mitem_confg_doc.dependent]
					special_include = [value.mitem for value in mitem_confg_doc.special_include]
				
					flag = False
					if include:
						for value in include:
							include_mitem = frappe.db.get_value("MItem Values", value, "mitems")
							if include_mitem in mitems:
								flag = True
								break
							else:
								missing_item.append(include_mitem)

						if not flag:
							frappe.throw(title='Error in Oasis Table', msg='<b>' + row.get('oasis_items') + '</b> is present so responses for one of the <b>' + str(missing_item) +  '</b> should be present.')


					if exclude:
						for value in exclude:
							exclude_mitem = frappe.db.get_value("MItem Values", value, "mitems")
							if exclude_mitem in mitems:
								frappe.throw(title='Error in Oasis Table', msg='<b>' + row.get('oasis_items') + '</b> is present so responses for <b>' + exclude_mitem +  '</b> should not be present.')
								

					if special_include and dependent and flag:
						missing_item = []
						flag = False
						for special_case in special_include:
							special_mitem = frappe.db.get_value("MItem Values", special_case, "mitems")
							if special_mitem in mitems:
								for value in dependent:
									dependent_mitem = frappe.db.get_value("MItem Values", value, "mitems")
									if dependent_mitem in mitems:
										flag = True
										break
									else:
										missing_item.append(dependent_mitem)
										frappe.throw(title='Error in Oasis Table', msg='<b>' + special_mitem + '</b> is present so responses for <b>' + str(missing_item) +  '</b> should be present.')

							else:
								pass

	# Clearning the values in oasis_item based on the error_marked == "No" conidtion
	def clear_values_based_on_error_marked(self):
		if self.error_marked == "No" or self.error_marked == '':
			for item in self.oasis_item:
				item.qa_clinician_response = ""
				item.qa_resason_for_change = ""

	def delete_row_oasis_item(self):
		for row in self.oasis_item[::-1]:
			if not row.oasis_items or not row.questions:
				self.remove(row)


	def update_activity_history(self):
		if frappe.db.exists("Work Allocation Activity History", {'name': self.name}):
			wah = frappe.get_doc("Work Allocation Activity History",self.name)

			if wah.wa_history and len(wah.wa_history) > 1:
				activity_list = []
				for activity in wah.wa_history:
					activity_list.append(activity.activity.strip())
			
			#Creation of Work Allocation
			if self.workflow_state in ['Draft', 'In-Progress'] and "Work allocation created" not in activity_list:
				wah.append("wa_history",{
						"activity" : "Work allocation created",
						"milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
						"user" : self.codername
					})
				
				if self.hold_reason:
					wah.append("wa_history",{
                            "activity" : "Hold Reason added: " + self.hold_reason ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.codername
                        })
				
				if self.technical_issue:
					wah.append("wa_history",{
                            "activity" : "Technical Issue added: " + self.technical_issue ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.codername
                        })
				
			if self.get_doc_before_save():

				#Production Completed
				if self.workflow_state == "Production Completed" and  "Production Completed" not in activity_list and not self.hold_reason and not self.get_doc_before_save().hold_reason:
					
					wah.append("wa_history",{
                            "activity" : "Production Completed",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.codername
                        })
				
				#Assign/Reassign of QA Lead
				if self.workflow_state == "Picked for Audit" and self.assigned_by and "WMS QA Work Allocation assigned" not in activity_list and not self.hold_reason and not self.get_doc_before_save().hold_reason:
					wah.append("wa_history",{
                            "activity" : "WMS QA Work Allocation assigned",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })
				
					wah.append("wa_history",{
                            "activity" : self.workflow_state,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_by
                        })
				

				if self.get_doc_before_save().assigned_by != self.assigned_by and "WMS QA Work Allocation assigned" in activity_list:
					wah.append("wa_history",{
                            "activity" : "Reassign to Another QA Lead",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_by
                        })
				
				#Assign/Reassign of QA
				if self.get_doc_before_save().email != self.email and "Pending Quality" not in activity_list:
					wah.append("wa_history",{
                            "activity" : "QA lead Assign To",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.email
                        })
					
					wah.append("wa_history",{
                            "activity" : "Pending Quality",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.email
                        })
				
				if self.get_doc_before_save().email != self.email and "Pending Quality" in activity_list:
					wah.append("wa_history",{
                            "activity" : "Reassigned to QA",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.email
                        })

				#Addition/Removal of Hold reason
				if self.hold_reason and self.get_doc_before_save().hold_reason != self.hold_reason:
					wah.append("wa_history",{
                            "activity" : "Hold Reason added: " + self.hold_reason ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })
				
				if self.get_doc_before_save().hold_reason and self.hold_reason in [None, '']:
					wah.append("wa_history",{
                            "activity" : "Removed Hold Reason: " + self.get_doc_before_save().hold_reason ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })
					
				#Addition/Removal of Technical reason
				if self.technical_issue and self.get_doc_before_save().technical_issue != self.technical_issue:
					wah.append("wa_history",{
                            "activity" : "Technical Issue added: " + self.technical_issue ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })
				
				if self.get_doc_before_save().technical_issue and self.technical_issue in [None, '']:
					wah.append("wa_history",{
                            "activity" : "Technical Issue removed: " + self.get_doc_before_save().technical_issue ,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })


				#Updation of Chart Status
				if self.get_doc_before_save().workflow_state != self.workflow_state and self.workflow_state not in [activity_list, 'Production Completed', 'Picked for Audit', 'Pending Quality', 'Locked']:
					wah.append("wa_history",{
                            "activity" : self.workflow_state,
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })
					

				if self.get_doc_before_save().workflow_state != self.workflow_state and self.workflow_state == "Locked":
					if self.workflow_state == "Locked":
						wah.append("wa_history",{
                            "activity" : "Chart Locked",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : frappe.session.user
                        })

			wah.save(ignore_permissions=True)
			wah.reload()


def careot(*args):
    oseries = []
    for element in args:
        osva = [os.multiple_values.split(".")[0] for os in element]
        oseries.append(osva)
    return oseries
		
def set_fields_to_na_and_read_only(qa_weightage, field_names):
    for field_name in field_names:
        qa_weightage.set(field_name, "NA")



# @frappe.whitelist()
# def create_workallocation_history(self,doc,handler=" "):	
# 	if self.chart_status == "In-Progress":
# 		if not frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.patient_reference_details}):
# 			wah = frappe.new_doc("Work Allocation Activity History")
# 			wah.flags.ignore_permissions  = True
# 			wah.work_allocation = self.patient_reference_details
# 			wah.mr_nubmber = self.mr_number
# 			wah.arrived_date = self.arrived_date
# 			wah.coder_name = self.codername			
# 			wah.save()



def todo_close_button(doc,method):	
	try:
		user = frappe.get_doc("User",frappe.session.user)
		if doc.chart_status == "In-Progress":					
			todo_name = frappe.db.get_value('ToDo',{'reference_name':doc.name},'name')
			if has_role_profile("Medical Coder"):
				frappe.db.sql(""" update `tabToDo` set status = "Closed"  WHERE name = "{0}" """.format(todo_name))

		elif doc.chart_status == "Pending Quality":
			todo_qa_name = frappe.db.get_value('ToDo',{'reference_name':doc.name},'name')			
			if has_role_profile(["QA Lead"]):
				frappe.db.sql(""" update `tabToDo` set status = "Closed"  WHERE name = "{0}" """.format(todo_qa_name))		
	except Exception as e:
		print(e)


@frappe.whitelist()
def update_work_allocation_activity_history(name,workflow_state,worlflow_list,creation,coder_name,coder_assign_date = None,patient_reference_details = None,**kwargs):
	
	if workflow_state and name:
		try:
			if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':name}):
				doc = frappe.get_doc('Work Allocation Activity History', {'work_allocation':name})
				doc.wa_history = []
				activities = []				
				# coder assign datetime 
				if coder_assign_date:
					if patient_reference_details:
						bulk_doc = frappe.get_doc("Bulk Upload Activities",patient_reference_details)
						activities.append({
							"activity" : "Add or Manage Activity Creation",
							"milestones": format_date(bulk_doc.creation,format_string = "dd-mm-yyyy" + " " + format_time(bulk_doc.creation,format_string = "HH:mm:ss")),
							"user" : bulk_doc.owner
						})
						# production tl reassign
						update_productiontl_history(bulk_doc.production_tl_reassign_table,activities)
						
						# medical coder reassign
						update_medical_coder_history(bulk_doc.medical_coder_reassign_table,activities)
						

				# add creation of coder work flow doctype
				activities.append({
					"activity": "Work allocation created",
					# "milestones":creation
					"milestones":format_date(creation,format_string = "dd-mm-yyyy" + " " + format_time(creation,format_string = "HH:mm:ss")),
					"user": coder_name
				})
				
				
				worlflow_list = json.loads(worlflow_list)

				for data in worlflow_list[::-1]:

					date = format_date(data.get("creation"),format_string = "dd-mm-yyyy" + " " + format_time(data.get("creation"),format_string = "HH:mm:ss"))

					activities.append({
						"activity":data.get("content"),
						"milestones":date,
						"user" : data.get("owner")
					})

					if data.get("content") == "Production Completed":
						# after production comlpleted ---> qa workallocation --> qa lead(datetime)
						
								
						# qa lead assign to another if assign
						if kwargs.get("qa_lead_reassign_table"):
							qa_lead_reassign_table = json.loads(kwargs.get("qa_lead_reassign_table"))

							for index,i in enumerate(qa_lead_reassign_table):
								if i.get("workflow") == "Production Completed":
								
									activities.append({
												"activity":"WMS QA Work Allocation assigned",
												"milestones":format_date(i.get("datetime"),format_string = "dd-mm-yyyy" + " " + format_time(i.get("datetime"),format_string = "HH:mm:ss")),
												"user" : i.get("assigned_to")
											})

									
					if data.get("content") == "Picked for Audit":

						if kwargs.get("qa_lead_reassign_table"):
							qa_lead_reassign_table = json.loads(kwargs.get("qa_lead_reassign_table"))

							for index,i in enumerate(qa_lead_reassign_table):
								if i.get("workflow") == "Picked for Audit":
									activities.append({
												"activity":"Assign to Another QA Lead",
												"milestones":format_date(i.get("datetime"),format_string = "dd-mm-yyyy" + " " + format_time(i.get("datetime"),format_string = "HH:mm:ss")),
												"user" : i.get("assigned_to")
											})
												
						# afterreview --> qalead assign to qa assign(datetime)
						if kwargs.get("qa_reassign_table"):
							qa_reassign_table = json.loads(kwargs.get("qa_reassign_table"))
							for item in qa_reassign_table:
									if item.get("workflow_state") == "Picked for Audit":
										activities.append({
												"activity":"QA lead Assign To",
												"milestones":format_date(item.get("datetime"),format_string = "dd-mm-yyyy" + " " + format_time(item.get("datetime"),format_string = "HH:mm:ss")),
												"user" : item.get("qa")
											})
														

					if data.get("content") == "Pending Quality":
						if kwargs.get("qa_reassign_table"):
							qa_reassign_table = json.loads(kwargs.get("qa_reassign_table"))

							for item in qa_reassign_table:
								if item.get("workflow_state") == "Pending Quality":
									activities.append({
											"activity":"QA Lead Assign To",
											"milestones":format_date(item.get("datetime"),format_string = "dd-mm-yyyy" + " " + format_time(item.get("datetime"),format_string = "HH:mm:ss")),
											"user" : item.get("qa")
										})

				if kwargs.get("final_chart_status_datetime") is not None:
					time,user = kwargs.get("final_chart_status_datetime").split("|")
					activities.append({
								"activity":"Chart Locked",
								"milestones":format_date(time,format_string = "dd-mm-yyyy" + " " + format_time(time,format_string = "HH:mm:ss")),
								"user" : user
							})
				else:
					activities.append({
								"activity":workflow_state,
								"milestones":format_date(now(),format_string = "dd-mm-yyyy" + " " + format_time(now(),format_string = "HH:mm:ss")),
								"user" : frappe.session.user
							})
					
				if kwargs.get("hold_reason_history1"):
					hold_reason_history = json.loads(kwargs.get("hold_reason_history1"))
					for item in hold_reason_history:
						activities.append({
								"activity":item.get('hold_reason_name'),
								"milestones":format_date(item.get("creation"),format_string = "dd-mm-yyyy" + " " + format_time(item.get("creation"),format_string = "HH:mm:ss")),
								"user" : item.get("user")
							})

				sorted_activities = sorted(activities, key=lambda x: datetime.strptime(x['milestones'], '%d-%m-%Y %H:%M:%S'))

				for data in sorted_activities:
					doc.append("wa_history",data)

				doc.save(ignore_permissions=True)
				doc.reload()
				# doc data need to refresh and update 
		except Exception as e:
			frappe.log_error(e, 'work allocation history')
			print(e, frappe.get_traceback())



@frappe.whitelist()
def employee_restrication_for_qa(doctype, txt, searchfield, start, page_len, filters):
	users = frappe.db.sql("""SELECT name,username from `tabUser` WHERE role_profile_name = "QA" """,as_list = 1)
	return users

from frappe.desk.doctype.bulk_update.bulk_update import submit_cancel_or_update_docs
@frappe.whitelist()
def bulk_update_qa_lead(doctype, docnames, data):
    if isinstance(docnames, str):
        docnames = frappe.parse_json(docnames)
        for doc in docnames:
            hold_reason = frappe.db.get_value("Medical Coder Flow", doc, 'hold_reason')
            technical_issue_value = frappe.db.get_value("Medical Coder Flow", doc, "technical_issue")
            if hold_reason:
                frappe.msgprint("Cannot assign/reassign as there is a Hold reason for the record " + doc, raise_exception=False, indicator='red')
                continue
            elif technical_issue_value:
                frappe.msgprint("Cannot assign/reassign as there is a <b>Technical Issue</b> for the record " + doc, raise_exception=False, indicator='red')
                continue
            else:
                docnames = [doc]
                submit_cancel_or_update_docs(doctype, docnames, action="update", data=data)
    # data = json.loads(data)
    # frappe.msgprint(
    # msg=f"{frappe.session.user} has reassigned the task to {data.get('assigned_by')} ",
    # title='Reassigned')


@frappe.whitelist()
def bulk_update_qa(doctype, docnames, data):
	if isinstance(docnames, str):
		docnames = frappe.parse_json(docnames)
		data = frappe.parse_json(data)
		old_users,new_users = deque(),deque()
		for doc in docnames:
			hold_reason = frappe.db.get_value("Medical Coder Flow", doc, 'hold_reason')
			technical_issue_value = frappe.db.get_value("Medical Coder Flow", doc, "technical_issue")
			if hold_reason:
				frappe.msgprint("Cannot assign/reassign as there is a Hold reason for the record " + doc, raise_exception=False, indicator='red')
				continue
			elif technical_issue_value:
				frappe.msgprint("Cannot assign/reassign as there is a <b>Technical Issue</b> for the record " + doc, raise_exception=False, indicator='red')
				continue
			else:
				wa_doc = frappe.get_doc("Medical Coder Flow", doc)
				old_users.append(wa_doc.email)
				emp_doc = frappe.db.get_value("Employee", {'name': data['email']}, ['name', 'employee_name', 'user_id'], as_dict=1)
				if not wa_doc.employee and not wa_doc.email:
					frappe.throw("Cannot reassign as the record <b>" + doc + "</b> not yet assigned")
				if wa_doc.workflow_state == "Chart Locked":
					frappe.throw(f"Cannot Reassign Chart Locked record <b>{doc}</b>")
				wa_doc.employee = emp_doc.name
				wa_doc.email = emp_doc.user_id
				wa_doc.assigned_to_name = emp_doc.employee_name
				wa_doc.save()
				if wa_doc.get_doc_before_save().email and wa_doc.get_doc_before_save().email != wa_doc.email:
					message = f"{wa_doc.mr_number} - Your assignment has been removed"
					user_list = [wa_doc.get_doc_before_save().email]
					subject = "Work Allocation Reassigned"
					make_system_notification(user_list, message,wa_doc.doctype,wa_doc.name,subject)
				new_users.append(emp_doc.user_id)
		
		if len(old_users)>0:
			decrement_activity_count(old_users=old_users,new_user=new_users[0],name='qa_count',key='QA')



@frappe.whitelist()
def get_team_lead_name(name = None):
    sql = f" select assigned_manager from `tabBulk Upload Activities` where name = '{name}' "
    return frappe.db.sql(sql,as_dict = True)


@frappe.whitelist()
def get_cancelled_qa_weightage():
	current_doc_name = frappe.form_dict.get("name")
	qa_weightage_records = frappe.db.sql("""
		SELECT name, medical_coder_flow, docstatus 
		FROM `tabQA Weightage`
		WHERE medical_coder_flow = %s
		ORDER BY name DESC
	""", (current_doc_name,), as_dict=True)
	latest_docstatus = qa_weightage_records[0]['docstatus'] if qa_weightage_records else None
	return latest_docstatus

							

@frappe.whitelist()
def set_filtered_mitems(name, child):
	if name:
		child = json.loads(child)
		exclude = []
		for row in child:
			if frappe.db.exists('MItems Configuration', {"mitem_name": row.get('oasis_items'), "redroad_coder_response": row.get("redroad_response")}):
				mitem_confg_doc = frappe.get_doc('MItems Configuration', {"mitem_name": row.get('oasis_items'), "redroad_coder_response": row.get("redroad_response")})
				for value in mitem_confg_doc.exclude:
					exclude_mitem = frappe.db.get_value("MItem Values", value.mitem, "mitems")
					exclude.append(exclude_mitem)
		return exclude


@frappe.whitelist()
def get_mitem_values(patient_reference_details = None):
	prd = frappe.get_doc('Bulk Upload Activities',{"name":patient_reference_details})
	mitem_values = frappe.db.get_list("MItem Values",
		filters={"payortype": prd.mitem_payortype, "assessment_type": prd.assessment_type},
		fields=["name","mitems","questions","picklist"]  
	)
	return mitem_values

@frappe.whitelist()
def get_qa_list(doctype, txt, searchfield, start, page_len, filters):
	if has_role_profile(["WMS Manager","Super Admin"]):
		results = frappe.db.sql(""" select distinct emp.name, emp.employee_name from `tabUser Permission` as up JOIN `tabEmployee` as emp on up.for_value = emp.name where  up.allow = 'Employee' and up.applicable_for = 'Medical Coder Flow' and emp.role = 'QA' """, as_list=True)
		return results
	else:
		results = frappe.db.sql(""" select emp.name, emp.employee_name from `tabUser Permission` as up JOIN `tabEmployee` as emp on up.for_value = emp.name where up.user = %s and up.allow = 'Employee' and up.applicable_for = 'Medical Coder Flow' and emp.role = 'QA' """, (frappe.session.user), as_list=True)
		return results