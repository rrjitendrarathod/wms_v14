# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_url,get_url_to_list
from wms.public.py.notification  import has_role_profile
from frappe.utils import (flt, rounded)
import math
import re
from frappe import _


class QAWeightage(Document):
	pass
	def onload(self):
		self.check_user_permission()


	def before_save(self):		
		self.check_cancel_or_hold(is_cancel=True)	
		data = frappe.db.get_value("Medical Coder Flow",filters={"name":self.medical_coder_flow}, fieldname=["chart_status"])
		if data == "Locked":
			frappe.throw(msg=f"You can't save the form {self.name} Because chart is <b>locked</b>")
		
		hold_reason = frappe.db.get_value("Medical Coder Flow",filters={"name":self.medical_coder_flow}, fieldname=["hold_reason"])
		if hold_reason:
			frappe.throw(msg=f"You can't save the form {self.name} Because Work Allocation is on <b> hold</b>")

	def validate(self):
		self.validate_duplicate_qa_weightage()
		self.calculate_coding_score_and_coding_weight__points()

	def before_submit(self):
		self.check_cancel_or_hold(is_cancel=True)

	def check_user_permission(self):
		if has_role_profile("Production TL") and frappe.session.user != "Administrator"  and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.team_lead:
				frappe.throw(f" Restricted Access: \
							<br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
				
		if has_role_profile("Medical Coder") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.coder_name:
				message = f" Restricted Access:"
				frappe.throw(f"{message}\
							<br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View </a> ")
				
		if has_role_profile("QA Lead") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.qa_lead:
				assigned = f" Restricted Access: "
				frappe.throw(f"{assigned} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View</a> ")
				
		if has_role_profile("QA") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
			if frappe.session.user != self.qa:
				assigned = f" Restricted Access:"
				frappe.throw(f"{assigned} \
                            <br> <br> <a href='{get_url_to_list('Medical Coder Flow')}'>Visit Work Allocation List View</a> ")

	@frappe.whitelist()
	def fetch_oasis_values(self):
		data = {}
		map_qa_fields = {"q7":"m0069_gender", "q8":"m1005_inpatient_discharge_date", "q9":"m0102_date_of_physician_ordered", "q10":"m0104_date_of_referral", 
						"q11":"m0150_current_payment", "q12":"m1033", "q13":"k0520_nutritional_approaches", "q14":"n0415_high_risk_drug", "q15":"pressure", "q16":"stasis", "q17":"surgical", "q18":"m1400_when_is_the_patient", "q19":"m1600", "q20":"m1610", "q21":"m1620", "q22":"m1630", "q23":"m1700", "q24":"m1710", "q25":"m1720", "q26":"m1740", "q27":"m1745", "q28":"m1800__grooming", "q29":"m1810__upper_body_dressing", "q30":"m1820_lower_body_dressing", "q31":"m1830_bathing", "q32":"m1840_toilet_transferring", "q33":"m1845_toileting_hygiene", "q34":"m1850__transfers", "q35":"m1860_ambulation", "q36":"m1870_feeding_or_eating", "q37":"gg0130__self_care", "q38":"gg0170__mobility", "q39":"m2020_management_of_oral_medications", "q40":"m2030_management_of_injectable", "q41":"o0110_special_treatments", "q42":"m2200_therapy_need"}

		if self.medical_coder_flow:
			med_doc = frappe.get_doc("Medical Coder Flow", self.medical_coder_flow)
			self.coder_name = med_doc.codername
			self.team_lead = med_doc.team_lead 
			data["assessment_type"]	= med_doc.assessment_type
			data["payor_type"] = med_doc.payor_type
			data["payor_type_hchb"] = med_doc.payor_type_hchb		
			if med_doc.hold_reason or med_doc.technical_issue:
				frappe.msgprint("You can't save the form,Work Allocation has hold reason or techinical issue", indicator="orange", title=_("Warning"))
			
			for k, v in map_qa_fields.items():
				val = frappe.db.get_value("QA Coding and OASIS Values", {"assessment_type":med_doc.assessment_type, "payor_type":med_doc.payor_type}, map_qa_fields.get(k))
				if val=="NA":
					data[k]=val
				else:
					data[k]="Yes"

			qacoaisis_doc = frappe.get_doc("QA Coding and OASIS Values", {"assessment_type":med_doc.assessment_type, "payor_type":med_doc.payor_type})
			self.coordination_note_points = qacoaisis_doc.coordination_note
			self.coordination_note_score = 100
			self.oasis_weight__points = qacoaisis_doc.total_oasis_score
			self.oasis_score = 100
			self.coding_weight__points = qacoaisis_doc.total_coding_score
			self.coding_score = 100
		return data


	@frappe.whitelist()
	def na_fields_read_only(self):
		data = {}
		map_qa_fields = {"q7":"m0069_gender", "q8":"m1005_inpatient_discharge_date", "q9":"m0102_date_of_physician_ordered", "q10":"m0104_date_of_referral", 
						"q11":"m0150_current_payment", "q12":"m1033", "q13":"k0520_nutritional_approaches", "q14":"n0415_high_risk_drug", "q15":"pressure", "q16":"stasis", "q17":"surgical", "q18":"m1400_when_is_the_patient", "q19":"m1600", "q20":"m1610", "q21":"m1620", "q22":"m1630", "q23":"m1700", "q24":"m1710", "q25":"m1720", "q26":"m1740", "q27":"m1745", "q28":"m1800__grooming", "q29":"m1810__upper_body_dressing", "q30":"m1820_lower_body_dressing", "q31":"m1830_bathing", "q32":"m1840_toilet_transferring", "q33":"m1845_toileting_hygiene", "q34":"m1850__transfers", "q35":"m1860_ambulation", "q36":"m1870_feeding_or_eating", "q37":"gg0130__self_care", "q38":"gg0170__mobility", "q39":"m2020_management_of_oral_medications", "q40":"m2030_management_of_injectable", "q41":"o0110_special_treatments", "q42":"m2200_therapy_need"}

		if self.medical_coder_flow:
			med_doc = frappe.get_doc("Medical Coder Flow", self.medical_coder_flow)
			self.coder_name = med_doc.codername
			self.team_lead = med_doc.team_lead 
			data["assessment_type"]	= med_doc.assessment_type
			data["payor_type"] = med_doc.payor_type
			data["payor_type_hchb"] = med_doc.payor_type_hchb
			
			for k, v in map_qa_fields.items():
				val = frappe.db.get_value("QA Coding and OASIS Values", {"assessment_type":med_doc.assessment_type, "payor_type":med_doc.payor_type}, map_qa_fields.get(k))
				if val=="NA":
					data[k]=val
				else:
					data[k]="Yes"

		return data


	@frappe.whitelist()
	def calculate_coding_score_and_coding_weight__points(self):
		coding_total = 0.0
		code_total = 0.0
		coding_score = 0.0
		map_fields={"q1":"primary_diagnosis", "q2":"symptom_codes", "q3":"coding_convention", "q4":"coding_guidelines", "q5":"appropriate_comorbidity"}
		qawt_doc = frappe.get_doc("QA Coding and OASIS Values", {"assessment_type":self.assessment_type, "payor_type":self.payor_type})
		if self.q1=="Yes" or self.q1=="NA":
			coding_total+=qawt_doc.primary_diagnosis
		if self.q2=="Yes" or self.q2=="NA":
			coding_total+=qawt_doc.symptom_codes
		if self.q3=="Yes" or self.q3=="NA":
			coding_total+=qawt_doc.coding_convention
		if self.q4=="Yes" or self.q4=="NA":
			coding_total+=qawt_doc.coding_guidelines

		assessment_type_lst = ["Followup", "Recert", "SOC", "SCIC"]
		payor_type_lst = ["Medicare", "Commercial", "Managed - Medicare", "Managed - Medicaid", "Medicaid", "Others"]


		if self.assessment_type=="ROC" and self.payor_type in payor_type_lst:
			if self.qx=="Yes-All correct":
				coding_total+=qawt_doc.appropriate_comorbidity
			else:
				a = flt(re.findall(r'\d+', self.qx)[0])
				b = flt(qawt_doc.appropriate_comorbidity)-a*0.833333333
				coding_total+=b
		elif self.payor_type=="Medicare" and self.assessment_type in assessment_type_lst:
			if self.qx=="Yes-All correct":
				coding_total+=qawt_doc.appropriate_comorbidity
			else:
				a = flt(re.findall(r'\d+', self.qx)[0])
				b = math.floor(flt(qawt_doc.appropriate_comorbidity)-a*0.833333333)
				coding_total+=b
		else:	
			if self.q5 == "Yes-All correct":
				coding_total+=qawt_doc.appropriate_comorbidity
			else:
				a=flt(re.findall(r'\d+', self.q5)[0])
				b = math.floor(flt(qawt_doc.appropriate_comorbidity)-a*2)
				coding_total+=b
		self.coding_weight__points=coding_total

		code_total = (coding_total/qawt_doc.total_coding_score)*100
		coding_score = rounded(code_total * 100) / 100
		self.coding_score = coding_score

		self.calculate_oasis_and_coordination_score()
		self.coding_errors_calculation()

		return True


	@frappe.whitelist()
	def calculate_oasis_and_coordination_score(self):
		#oasis calculation
		oasis_total = 0.0
		oas_total = 0.0
		oasis_score = 0.0
		qawt_doc = frappe.get_doc("QA Coding and OASIS Values", {"assessment_type":self.assessment_type, "payor_type":self.payor_type})
		map_qa_fields = {"q7":"m0069_gender", "q8":"m1005_inpatient_discharge_date", "q9":"m0102_date_of_physician_ordered", "q10":"m0104_date_of_referral", 
						"q11":"m0150_current_payment", "q12":"m1033", "q13":"k0520_nutritional_approaches", "q14":"n0415_high_risk_drug", "q15":"pressure", "q16":"stasis", "q17":"surgical", "q18":"m1400_when_is_the_patient", "q19":"m1600", "q20":"m1610", "q21":"m1620", "q22":"m1630", "q23":"m1700", "q24":"m1710", "q25":"m1720", "q26":"m1740", "q27":"m1745", "q28":"m1800__grooming", "q29":"m1810__upper_body_dressing", "q30":"m1820_lower_body_dressing", "q31":"m1830_bathing", "q32":"m1840_toilet_transferring", "q33":"m1845_toileting_hygiene", "q34":"m1850__transfers", "q35":"m1860_ambulation", "q36":"m1870_feeding_or_eating", "q37":"gg0130__self_care", "q38":"gg0170__mobility", "q39":"m2020_management_of_oral_medications", "q40":"m2030_management_of_injectable", "q41":"o0110_special_treatments", "q42":"m2200_therapy_need"}
		cur_oasis_val = {"q7":self.q7, "q8":self.q8, "q9":self.q9, "q10":self.q10, "q11":self.q11, "q12":self.q12, "q13":self.q13, "q14":self.q14, "q15":self.q15, "q16":self.q16, "q17":self.q17, "q18":self.q18, "q19":self.q19, "q20":self.q20, "q21":self.q21, "q22":self.q22, "q23":self.q23, "q24":self.q24, "q25":self.q25, "q26":self.q26, "q27":self.q27, "q28":self.q28, "q29":self.q29, "q30":self.q30, "q31":self.q31, "q32":self.q32, "q33":self.q33, "q34":self.q34, "q35":self.q35, "q36":self.q36, "q37":self.q37, "q38":self.q38, "q39":self.q39, "q40":self.q40, "q41":self.q41, "q42":self.q42}

		d = ["Yes", "NA"]
		for k, v in map_qa_fields.items():
			val = frappe.db.get_value("QA Coding and OASIS Values", {"assessment_type":self.assessment_type, "payor_type":self.payor_type}, map_qa_fields.get(k))
			if val!="NA" and cur_oasis_val.get(k) in d:
				oasis_total+=flt(val)

		self.oasis_weight__points = oasis_total
		oas_total = (oasis_total/flt(qawt_doc.total_oasis_score))*100
		oasis_score = rounded(oas_total * 100) / 100
		self.oasis_score = oasis_score
		
		# coordination calculation 
		coord_note_total = 0.0
		coord_total = 0.0
		coordination_note_score = 0.0
		if self.q43 in d:
			coord_note_total+=flt(qawt_doc.coordination_note)

		self.coordination_note_points = coord_note_total
		coord_total = (coord_note_total/flt(qawt_doc.coordination_note))*100
		coordination_note_score = rounded(coord_total * 100) / 100
		self.coordination_note_score = coordination_note_score
		return True

	@frappe.whitelist()
	def coding_errors_calculation(self):
		#Calcuation of Total Error and Grand Total
		coding_totoal_errors = 0.0
		total_errors = 0.0
		grand_total = 0.0
		coding_values = {"q1":self.q1, "q2":self.q2, "q3":self.q3, "q4":self.q4}
		
		for k, v in coding_values.items():
			if v=="No":
				coding_totoal_errors+=1
				total_errors+=1
				grand_total+=1

		if self.q5 != "Yes-All correct":
			coding_totoal_errors+=flt(re.findall(r'\d+', self.q5)[0])
			grand_total+=flt(re.findall(r'\d+', self.q5)[0])
			total_errors+=1
		if self.qx != "Yes-All correct":
			coding_totoal_errors+=flt(re.findall(r'\d+', self.qx)[0])
			grand_total+=flt(re.findall(r'\d+', self.qx)[0])
			total_errors+=1
		self.coding_totoal_errors = coding_totoal_errors

		cur_oasis_val = {"q7":self.q7, "q8":self.q8, "q9":self.q9, "q10":self.q10, "q11":self.q11, "q12":self.q12, "q13":self.q13, "q14":self.q14, "q15":self.q15, "q16":self.q16, "q17":self.q17, "q18":self.q18, "q19":self.q19, "q20":self.q20, "q21":self.q21, "q22":self.q22, "q23":self.q23, "q24":self.q24, "q25":self.q25, "q26":self.q26, "q27":self.q27, "q28":self.q28, "q29":self.q29, "q30":self.q30, "q31":self.q31, "q32":self.q32, "q33":self.q33, "q34":self.q34, "q35":self.q35, "q36":self.q36, "q37":self.q37, "q38":self.q38, "q39":self.q39, "q40":self.q40, "q41":self.q41, "q42":self.q42}

		oasis_total_erros= 0.0
		for k, v in cur_oasis_val.items():
			if v=="No":
				oasis_total_erros+=1
				total_errors+=1
				grand_total+=1

		if oasis_total_erros==0:
			self.oasis="No"
			self.oasis_total_erros=0
		else:
			self.oasis="Yes"
			self.oasis_total_erros = oasis_total_erros

		total_coordination = 0.0
		if self.q43=="No":
			self.total_coordination=1
			total_errors+=1
			grand_total+=1
		else:
			self.total_coordination=0

		self.total_errors = total_errors
		self.grand_total=grand_total

		#Logic for Error Type Classification
		d = ["Yes", "NA"]
		if self.q1=="No":
			self.error_type_classification = "Very Critical"
		elif self.q1 in d and self.q2 in d and self.q3 in d and self.q4 in d and self.q43 in d:
			if self.q5!="Yes-All correct" or self.qx!="Yes-All correct":
				self.error_type_classification = "Non Critical"
			else:
				self.error_type_classification = "No Error" 
		elif self.q1 in d and (self.q2=="No" or self.q3=="No" or self.q4=="No" or self.q43=="No"):
			self.error_type_classification = "Critical"

		# Total Score Calculation
		total_score = 0.0
		total_score = flt(self.coding_weight__points)+flt(self.oasis_weight__points)+flt(self.coordination_note_points)
		self.total_score = total_score

		if total_score == 100:
			self.pass_="Yes"
		else:
			self.pass_="No"

	# Calling the get_hold_reason Function into the before_cancel and before_submit

	@frappe.whitelist()
	def get_hold_reason(self):
		return frappe.db.get_value("Medical Coder Flow",
									filters={"name": self.medical_coder_flow},
									fieldname=["hold_reason", "workflow_state","error_marked",'accept_error_from_qa_lead', 'technical_issue'])

	def before_cancel(self):
		self.check_cancel_or_hold(is_cancel=True)

	def check_cancel_or_hold(self, is_cancel=False):
		docstatus_list = [0, 1, 2]
		hold_reason_qa, workflow_state, error_marked_qa,aefql, technical_issue = self.get_hold_reason()
		if not hold_reason_qa and not technical_issue:
				allowed_states = ["Pending Quality", 
								  "QA Error Accepted by QA TL", 
								  "Coder Error Rejected by Department Head", 
								  "QA Error Accepted by QA Manager"
								  ]

				if is_cancel:
					if (error_marked_qa == "No" and workflow_state == "No Error" and self.docstatus == 2) or \
					(aefql == "No" and workflow_state == "QA Error Accepted by QA TL" and self.docstatus == 2) or \
					(error_marked_qa == "Yes" and self.docstatus in docstatus_list and workflow_state not in allowed_states):
						frappe.throw(f"You can't cancel this form <b>{self.name}</b> because the workflow state is <b>{workflow_state}</b>.")
		
		elif hold_reason_qa or technical_issue:
			frappe.throw(f" Cannot cancel <b>{self.name}</b>  because Work Allocation has hold reason or technical issue")

	def validate_duplicate_qa_weightage(self):
		existing_record = frappe.get_value('QA Weightage', {
					'name': ('!=', self.name),
					'medical_coder_flow': self.medical_coder_flow,
					'docstatus': ('in', [0,1])
				})

		if existing_record:
			frappe.throw(f"Record already existing")