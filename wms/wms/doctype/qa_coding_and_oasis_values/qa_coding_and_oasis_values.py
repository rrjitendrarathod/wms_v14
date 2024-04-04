# Copyright (c) 2023, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import (flt, rounded)

class QACodingandOASISValues(Document):
	def validate(self):
		#calculation of Total Coding and OASIS Score
		total_coding_score = 0.0
		total_coding_score=flt(self.primary_diagnosis)+flt(self.symptom_codes)+flt(self.coding_convention)+flt(self.coding_guidelines)+flt(self.appropriate_comorbidity)
		self.total_coding_score=total_coding_score

		cur_oasis_values = [self.m0069_gender, self.m1005_inpatient_discharge_date, self.m0102_date_of_physician_ordered, self.m0104_date_of_referral, self.m0150_current_payment, self.m1033, self.k0520_nutritional_approaches, self.n0415_high_risk_drug, self.pressure, self.stasis, self.surgical, self.m1400_when_is_the_patient, self.m1600, self.m1610, self.m1620, self.m1630, self.m1700, self.m1710, self.m1720, self.m1740, self.m1745, self.m1800__grooming, self.m1810__upper_body_dressing, self.m1820_lower_body_dressing, self.m1830_bathing, self.m1840_toilet_transferring, self.m1845_toileting_hygiene, self.m1850__transfers, self.m1860_ambulation, self.m1870_feeding_or_eating, self.gg0130__self_care, self.gg0170__mobility, self.m2020_management_of_oral_medications, self.m2030_management_of_injectable, self.o0110_special_treatments, self.m2200_therapy_need]

		total_oasis_score = 0.0
		for val in cur_oasis_values:
			if val!="NA":
				total_oasis_score+=flt(val)
		self.total_oasis_score = total_oasis_score