# Copyright (c) 2023, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from wms.public.py.notification  import has_role_profile

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data

def get_columns():
	return [
		# { "fieldname": "chart_status", "label": _("Chart Status"), "fieldtype": "Data","width": 110 },
		{ "fieldname": "name", "label": _("Work Allocation"), "fieldtype": "Data","width": 80},
		{ "fieldname": "qa_name", "label": _("QA Weightage"),"options": "QA Weightage", "fieldtype": "Link","width": 80 },
		
		{ "fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 110 },
		{"fieldname": "payor_type_hchb", "label": _("Payor Type (As per HCHB)"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "codername", "label": _("Coder"), "fieldtype": "Data","width": 110 },
		{"fieldname": "team_lead", "label": _("Production TL"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "email", "label": _("QA"), "fieldtype": "Data", "width": 120 },
		{"fieldname": "assigned_by", "label": _("QA TL"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "audit_date", "label": _("Audit Date"), "fieldtype": "Date", "width": 100 },
		{"fieldname": "production_completed_date", "label": _("Production Completed Date"), "fieldtype": "Date", "width": 150 },
		{"fieldname": "rebutal_status", "label": _("Rebutal Status"), "fieldtype": "Data", "width": 100 },
		{"fieldname": "docstatus", "label": _("QA Weightage Status"), "fieldtype": "Data", "width": 100 },


		


		##coding####
		{ "fieldname": "q1", "label": _("Is the primary diagnosis the focus of care?"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q2", "label": _("Are symptom codes or questionable encounter diagnosis appropriate?	"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q3", "label": _("Does the coding on the 485 follow coding convention?"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q4", "label": _("Does the coding on the 485 follow coding guidelines?"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "qx", "label": _("Have the appropriate co-morbidity diagnosis been coded?"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "coding_weight__points", "label": _("Coding Weight  Points"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "coding_score", "label": _("Coding Score"), "fieldtype": "Data","width": 150 },

		##OASIS##
		{"fieldname": "q7", "label": _("M0069 Gender"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q8", "label": _("M1005- Inpatient discharge date"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q9", "label": _("	M0102 - Date of Physician Ordered SOC (ROC)	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q10", "label": _("	M0104 - Date of Referral"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q11", "label": _("	M0150 Current Payment Sources for Home Care	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q12", "label": _("M1033"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q13", "label": _("	K0520 - Nutritional Approaches	"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q14", "label": _("	N0415: High -Risk Drug Classes: Use and Indication	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q15", "label": _("	Pressure (M1306, M1311, M1322, M1324)	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q16", "label": _("	Stasis (M1330, M1332, M1334)	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q17", "label": _("	Surgical (M1340, M1342)"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q18", "label": _("	M1400 - When is the patient dyspneic or noticeably short of breath?	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q19", "label": _("M1600"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q20", "label": _("	M1610	"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q21", "label": _("M1620"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q22", "label": _("M1630"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q23", "label": _("M1700"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q24", "label": _("M1710"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q25", "label": _("M1720"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q26", "label": _("M1740"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q27", "label": _("M1745"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q28", "label": _("	M1800 Grooming	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q29", "label": _("	M1810 Upper Body Dressing	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q30", "label": _("	M1820-Lower Body Dressing	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q31", "label": _("	M1830 - Bathing	"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q32", "label": _("	M1840-Toilet Transferring	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q33", "label": _("	M1845-Toileting Hygiene	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q34", "label": _("	M1850 - Transfers	"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q35", "label": _("M1860 - Ambulation / Locomotion"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q36", "label": _("	M1870- Feeding or Eating	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q37", "label": _("	GG0130 Self care	"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "q38", "label": _("	GG0170 Mobility	"), "fieldtype": "Data","width": 150 },
		{"fieldname": "q39", "label": _("	M2020 - Management of Oral Medications	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q40", "label": _("	M2030 - Management of injectable medications	"), "fieldtype": "Data", "width": 150 },
		{"fieldname": "q41", "label": _("	O0110 - Special treatments, procedures, and programs	"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "q42", "label": _("	M2200 - Therapy Need	"), "fieldtype": "Data","width": 150 },
		{"fieldname": "oasis_score", "label": _("OASIS Score	"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "oasis_weight__points", "label": _("OASIS Weight Points	"), "fieldtype": "Data","width": 150 },

		###Coordination Note ###
		{ "fieldname": "q43", "label": _("Is review email (including any correspondence)copied into coordination note?"), "fieldtype": "Data","width": 150 },
		{"fieldname": "coordination_note_points", "label": _("Coordination Note Score"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "coordination_note_score", "label": _("Coordination Note Points"), "fieldtype": "Data","width": 150 },

		##Error Section##
		{ "fieldname": "coding_totoal_errors", "label": _("Coding SectionError"), "fieldtype": "Data","width": 150 },
		{"fieldname": "oasis_total_erros", "label": _("Oasis Section Error"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "oasis", "label": _("Oasis Error"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "total_coordination", "label": _("Coordination Section Error"), "fieldtype": "Data","width": 150 },
		{"fieldname": "total_errors", "label": _("Total Errors"), "fieldtype": "Data", "width": 150 },
		{ "fieldname": "grand_total", "label": _("Grand Total Error Count"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "error_type_classification", "label": _("Error Type Classification"), "fieldtype": "Data","width": 150 },

		{ "fieldname": "total_score", "label": _("Total Score"), "fieldtype": "Data","width": 150 },
		{ "fieldname": "pass_", "label": _("Pass"), "fieldtype": "Data","width": 150 },

		
	]


def get_data(filters):
	conditions = ""
	if filters.get("name"):
		conditions += f''' AND r.name = '{filters.get("name")}' '''
	if filters.get("qa_name"):
		conditions += f''' AND q.name = '{filters.get("qa_name")}' '''
	
	

	if frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
		# Production TL
		if has_role_profile("Production TL"):
			conditions += f" AND r.team_lead = '{frappe.session.user}' "

		# Medical Coder
		if has_role_profile("Medical Coder"):
			conditions += f" AND r.codername = '{frappe.session.user}' "
		
		# QA Lead
		if has_role_profile("QA Lead"):
			conditions += f" AND r.assigned_by = '{frappe.session.user}' "
		
		# QA
		if has_role_profile("QA"):
			conditions += f" AND r.email = '{frappe.session.user}' "
		
		# Operation Manager
		if has_role_profile("Operations Manager"):
			production_tls = tuple(get_production_tl())
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" AND r.team_lead = '{production_tls[0]}' "
				else:
					conditions += f" AND r.team_lead IN {production_tls} "
			else:
				conditions += " AND r.team_lead = ' ' "

		#QA Manager 
		if has_role_profile('QA Manager'):
			qa_lead_user = tuple(get_qa_lead())
			if qa_lead_user:
				if len(qa_lead_user) == 1:
					conditions += f" AND r.assigned_by = '{qa_lead_user[0]}' "
				else:
					conditions += f" AND r.assigned_by IN {qa_lead_user} "
			else:
				conditions += " AND r.assigned_by = ' ' "


		# Department Head
		if has_role_profile("Department Head"):
			production_tls = tuple(get_production_tl())			
			if production_tls:
				if len(production_tls) == 1:
					conditions += f" AND r.team_lead = '{production_tls[0]}' "
				else:
					conditions += f" AND r.team_lead IN {production_tls} "
			else:
				conditions += " AND r.team_lead = ' ' "

		#Show both Cancelled and Submitted forms
		if has_role_profile(["QA", "QA Lead", "QA Manager", "Department Head"]):
			conditions += f" AND (q.docstatus = 1 OR q.docstatus = 2)"

		#Show only Submitted
		elif has_role_profile(["Production TL", "Medical Coder", "Operations Manager"]):
			conditions += f" AND q.docstatus = 1"
		

	data = frappe.db.sql(f"""SELECT r.name, r.chart_status, r.mr_number,r.payor_type_hchb,r.payor_type,r.assessment_type,r.codername,r.team_lead,r.assigned_by,r.email,r.production_completed_date,
            	q.name AS qa_name,q.medical_coder_flow,r.rebutal_status,r.audit_date, q.docstatus,
                q.q1, q.q2, q.q3, q.q4, q.qx, q.q5, q.q7, q.q8, q.q9, q.q10, q.q11, q.q12, q.q13, q.q14, q.q15, q.q16,
                q.q17, q.q18, q.q19, q.q20, q.q21, q.q22, q.q23, q.q24, q.q25, q.q26, q.q27, q.q28, q.q29, q.q30, q.q31, q.q32,
                q.q33, q.q34, q.q35, q.q36, q.q37, q.q38, q.q39, q.q40, q.q41, q.q42, q.q43, q.oasis_weight__points, q.oasis_score,
               FORMAT( q.coding_weight__points,2) AS coding_weight__points , q.coding_score, q.coordination_note_score, q.coding_totoal_errors, q.oasis_total_erros,
                q.coding_totoal_errors, q.oasis, q.total_coordination, q.total_errors, q.grand_total, q.error_type_classification, 
                FORMAT(q.total_score, 2) AS total_score, q.pass_, q.coordination_note_points
                FROM `tabMedical Coder Flow` r
                LEFT JOIN `tabQA Weightage` q ON r.name = q.medical_coder_flow WHERE r.name IS NOT NULL {conditions} AND r.chart_status != "Pending Quality"  AND q.docstatus > 0  ORDER BY r.creation desc""",as_dict = 1) 

	for row in data:
		if row.get("chart_status") == "Pending Quality" and has_role_profile("QA Lead"):
			row["mr_number"] = ""

		if row.get("chart_status") != "Locked":
			row["rebutal_status"] = ""
		
		if row.get("docstatus") == 1:
			row["docstatus"] = "Submitted"

		elif row.get("docstatus") == 2:
			row["docstatus"] = "Cancelled"

	return data


def get_qa_lead():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
	qa_lead = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
	return qa_lead 


def get_production_tl():
	data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='User' and applicable_for = 'Medical Coder Flow'",as_dict = True)
	users =[user['for_value'] for user in data if "Production TL" in frappe.get_roles(user["for_value"])]
	return users if users else []


def get_assigned_qatl():
	if has_role_profile(["Operations Manager","Department Head"]) and frappe.session.user != "Administrator":
		data = frappe.db.sql(f"select distinct(for_value) from `tabUser Permission` where user='{frappe.session.user}' and allow='Employee' and applicable_for = 'Medical Coder Flow' ",as_dict = True)
		users = [frappe.get_doc("Employee",user['for_value']).user_id for user in data if "QA Lead" in frappe.get_roles(frappe.get_doc("Employee",user['for_value']).user_id)]
		return "\n".join(users)	

@frappe.whitelist()
def get_work_allocations(doctype, txt, searchfield, start, page_len, filters):
	user = frappe.session.user
	conditions = ''
	field_to_filter = ''
	
	if not has_role_profile(['Super Admin','WMS Manager']) and frappe.session.user != "Administrator":
		if has_role_profile("QA Lead") or has_role_profile("QA Manager"):
			field_to_filter = 'assigned_by'
		elif has_role_profile("Production TL") or has_role_profile("Department Head") or has_role_profile("Operations Manager"):
			field_to_filter = 'team_lead'
		elif has_role_profile("QA"):
			field_to_filter = 'email'
		elif has_role_profile("Medical Coder"):
			field_to_filter = 'codername'
		
	if txt:
		if conditions:
			conditions += f" and (medical_coder_flow LIKE '%{txt}%' or mr_number_qa LIKE '%{txt}%')"
		else:
			conditions = f" WHERE medical_coder_flow LIKE '%{txt}%' or mr_number_qa LIKE '%{txt}%'"

	if field_to_filter:
		if conditions:
			conditions += f" and {field_to_filter} = '{user}'"
		else:
			conditions = f" WHERE {field_to_filter} = '{user}'"	
	return frappe.db.sql(f"""SELECT distinct name,mr_number FROM `tabMedical Coder Flow` where name in (select distinct medical_coder_flow FROM `tabQA Weightage`  {conditions})""")



@frappe.whitelist()
def get_qa_weightage(doctype, txt, searchfield, start, page_len, filters):
	user = frappe.session.user
	conditions = ''
	field_to_filter = ''
	
	if not has_role_profile(['Super Admin','WMS Manager']) and frappe.session.user != "Administrator":
		if has_role_profile("QA Lead") or has_role_profile("QA Manager"):
			field_to_filter = 'qa_lead'
		elif has_role_profile("Production TL") or has_role_profile("Department Head") or has_role_profile("Operations Manager"):
			field_to_filter = 'team_lead'
		elif has_role_profile("QA"):
			field_to_filter = 'qa'
		elif has_role_profile("Medical Coder"):
			field_to_filter = 'coder_name'	


	if txt:
		if conditions:
			conditions += f" and (medical_coder_flow LIKE '%{txt}%' or mr_number_qa LIKE '%{txt}%')"
		else:
			conditions = f" WHERE medical_coder_flow LIKE '%{txt}%' or mr_number_qa LIKE '%{txt}%'"

	if field_to_filter:
		if conditions:
			conditions += f" and {field_to_filter} = '{user}'"
		else:
			conditions = f" WHERE {field_to_filter} = '{user}'"
	return frappe.db.sql(f""" SELECT DISTINCT name FROM `tabQA Weightage` {conditions}""")