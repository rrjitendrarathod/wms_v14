# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from frappe import _
import frappe

def execute(filters=None):
	columns =  get_columns()	
	asset = get_data(filters)
	chart = get_chart_data(filters, columns, asset)
	report_summary = get_report_summary(filters, columns, asset)

	return columns,asset,None,chart,report_summary


def get_data(filters):	
	_from , to = filters.get('from'),filters.get('to')
	#conditions
	conditions = " AND 1=1 "
	if(filters.get('name')):conditions += f" AND  name = '{filters.get('name')}'"
	if(filters.get('chart_status')):conditions += f" AND e.chart_status = '{filters.get('chart_status')}'"	

	#data
	state_record = []


	user_role = frappe.get_doc('User',frappe.session.user)
	current_logined_user = frappe.db.sql("""SELECT user,allow,for_Value FROM `tabUser Permission`""",as_dict = True)
	current_logined = [k for k in current_logined_user if k['user'] == frappe.session.user]	
	res = [sub['for_Value'] for sub in current_logined]
	
	sql =frappe.db.sql(f"""SELECT "Medical Coder Flow", e.creation_date,e.name,e.mr_number,e.arrived_date,e.assessment_type,e.payor_type,
		e.assessment_type,e.payor_type,e.chart_status,e.hold_reason,e.codername,e.assigned_by,e.team_lead,e.email,e.workflow_state,e.employee,
		ee.mr_number,ee.name,ee.status FROM `tabToDo` ee INNER JOIN `tabMedical Coder Flow` e
		ON ee.mr_number = e.mr_number  	WHERE (e.creation_date BETWEEN '{_from}' AND '{to}') {conditions}""",as_dict=True)
	

	for sub in sql:
		if user_role.role_profile_name == "QA" and  sub['email'] == frappe.session.user:
			state_record.append(sub)
		
			
	a = list({x['mr_number']:x for x in state_record}.values())		
	return 	a	



def get_columns():
	user  = frappe.get_doc('User',frappe.session.user)
	list_def =[{ "fieldname": "mr_number", "label": _("MR Number"), "fieldtype": "Data","width": 110 },
			{"fieldname": "arrived_date", "label": _("Arrived Date"), "fieldtype": "Date", "width": 180 },
			{"fieldname": "assessment_type", "label": _("Assessment Type"), "fieldtype": "Data", "width": 120 },
			{"fieldname": "payor_type", "label": _("Payor Type"), "fieldtype": "Data", "width": 120 },
			{"fieldname": "chart_status", "label": _("Chart Status"), "fieldtype": "Data", "width": 150 },
			{"fieldname": "hold_reason", "label": _("Hold Reason"), "fieldtype": "Data", "width": 150 },
			{"fieldname": "name", "label": _("ToDo ID"), "fieldtype": "Data", "width": 110 },
			{"fieldname": "status", "label": _("ToDo Status"), "fieldtype": "Data", "width": 110 }]
	if(user.role_profile_name == "QA Lead"):
		list_def.pop(0)
	elif(user.role_profile_name== "Production TL" or user.role_profile_name == "Operations Manager" or user.role_profile_name == "Department Head" or user.role_profile_name == "QA Manager"):
		del list_def[6:]
	return list_def




def get_report_summary(filters, columns, asset):
	mr_number_count = 0	
	
	user  = frappe.get_doc('User',frappe.session.user)
	if user.role_profile_name == "QA"  or user.role_profile_name == "Administrator":
		for val in asset:			
			if val['mr_number']:
				mr_number_count += 1			
		return [
			{
				"value": mr_number_count,
				"label": "Total Work Allocation",
				"datatype": "Data",
				"indicator": "Blue",			
			},
					
		]

def get_chart_data(filters, columns, asset):
	# labels = [d.get("label") for d in columns[4:5]]
	
	
	pc,cr,ceabdh,embqa,c1stlevelapp,pq,cerqtf,qeabqtl,cer1sap,cerdh,qerbqt,cerl2l1app,qerbqm,ecbqa,loc,ceabl1sup1stlevappeal,c2nlevappeal,cerl2su2nd,ecbc,qappeal,qeabqm,ceal1suppostqatl,ceal21stapp,=0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0

	for i in asset:
		if i['chart_status'] == "Production Completed":
			pc += 1
		elif i['chart_status'] == 'Clarification Required ':
			cr += 1
		elif i['chart_status'] =="Pending Quality":
			pq += 1
		elif i['chart_status'] == "Error Marked By QA":
			embqa += 1
		elif i['chart_status'] == "Coder Error Accepted  by L1 supervisor - 1st Level Appeal":
			ceabl1sup1stlevappeal += 1
		elif i['chart_status'] == "Coder 2nd Level Appeal":
			c2nlevappeal += 1			
		elif i['chart_status'] == "Coder Error Rejected by L2 Supervisor - 2nd Level Appeal":
			cerl2su2nd += 1			
		elif i['chart_status'] == "Coder 1st Level Appeal":
			c1stlevelapp += 1
		elif i['chart_status'] == "QA Error Rejected by QA TL":
			qerbqt += 1
		elif i['chart_status'] == "Coder Error Accepted by Department Head":
			ceabdh += 1
		elif i['chart_status'] == "Coder Error Rejected  by L1 supervisor-Post QA TL Feedback":
			cerqtf += 1		
		elif i['chart_status'] == "Coder Error Rejected by L2 supervisor - 1st Level Appeal":
			cerl2l1app += 1
		elif i['chart_status'] == "QA Error Rejected by QA Manager":
			qerbqm += 1		
		elif i['chart_status'] == "QA Appeal":
			qappeal += 1
		elif i['chart_status'] == "QA Error Accepted by QA Manager":
			qeabqm += 1
		elif i['chart_status'] == "QA Error Accepted by QA TL":
			qeabqtl += 1
		elif i['chart_status'] == "Coder Error Rejected by L1 supervisor - 1st Level Appeal":
			cer1sap  += 1
		elif i['chart_status'] == "Coder Error Accepted  by L1 supervisor-Post QA TL Feedback":
			ceal1suppostqatl += 1
		elif i['chart_status'] == "Coder Error Accepted  by L2 supervisor - 1st Level Appeal":
			ceal21stapp += 1
		elif i['chart_status'] =="Coder Error Rejected by Department Head":
			cerdh += 1
		elif i['chart_status'] == "Error Corrected by QA":
			ecbqa += 1
		elif i['chart_status'] == "Error Corrected by Coder":
			ecbc += 1
		elif i['chart_status'] == "Locked":
			loc += 1

	chart = {
		'data':{
			'labels':["Production Completed","Clarification Required","Pending Quality","Error Marked By QA","Coder Error Accepted  by L1 supervisor - 1st Level Appeal",
					"Coder 2nd Level Appeal",
					"Coder Error Rejected by L2 Supervisor - 2nd Level Appeal",
					"Coder 1st Level Appeal","QA Error Rejected by QA TL","Coder Error Accepted by Department Head","Coder Error Rejected  by L1 supervisor-Post QA TL Feedback",
					"Coder Error Rejected by L2 supervisor - 1st Level Appeal",
					"QA Error Rejected by QA Manager",	
					"QA Appeal",
					"QA Error Accepted by QA Manager",
					"QA Error Accepted by QA TL",
					'Coder Error Rejected by L1 supervisor - 1st Level Appeal',
					"Coder Error Accepted by L1 supervisor-Post QA TL Feedback",
					"Coder Error Accepted  by L2 supervisor - 1st Level Appeal",
					"Coder Error Rejected by Department Head",
					"Error Corrected by QA",
					"Error Corrected by Coder",
					"Locked",
				],

			
			'datasets':[{'values':[pc,cr,pq,embqa,ceabl1sup1stlevappeal,c2nlevappeal,cerl2su2nd,c1stlevelapp,qerbqt,ceabdh,cerqtf,cerl2l1app,qerbqm,qappeal,qeabqm,qeabqtl,cer1sap,ceal1suppostqatl,ceal21stapp,cerdh,ecbqa,ecbc,loc]}]
		}
		,'type':'bar'
	}

	return chart
