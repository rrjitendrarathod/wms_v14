# Copyright (c) 2023, Manju and contributors
# For license information, please see license.txt
from __future__ import unicode_literals
import frappe

from frappe import _


def execute(filters=None):
    columns =  get_columns()	
    asset = get_data(filters)		
    return columns,asset

def get_data(filters):

    conditions = ""
    if(filters.get('user')):conditions += f" AND e.user_id = '{filters.get('user')}'"	

    heira_name = frappe.db.sql(f"""SELECT "Employee",e.name,e.employee_name,e.user_id,e.role,e.user_id,r.employee FROM `tabReport Heirarchy` r INNER JOIN `tabEmployee` e ON r.parent = e.employee  {conditions}""",as_dict = 1)
    for d in heira_name:
            wms_herirchy = frappe.db.sql(f"select employee,designation,role,user_id from `tabReport Heirarchy` where parent = '{d.name}' ",as_dict = True)       
            if wms_herirchy:
                for sub in wms_herirchy:
                    if sub['role'] == "Production TL":
                        d.update({'production_tl' : sub['user_id']})

                    if sub['role'] == "QA Lead":
                        d.update({'qa_tl' : sub['user_id']})


                    if sub['role'] == "Operations Manager":
                        d.update({'operationn_manager' : sub['user_id']})


                    if sub['role'] == "QA Manager":
                        d.update({'qa_manager' : sub['user_id']})


                    if sub['role'] == "Department Head":
                        d.update({'dept_head' : sub['user_id']})

    a = list({x['employee_name']:x for x in heira_name}.values())	
    return a


def get_columns():
    return [
        {"fieldname": "name", "label": _("Employee ID"),"fieldtype": "Data", "width": 120},
        {"fieldname": "role", "label": _("Employee Role"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "employee_name", "label": _("Employee Name"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "user_id", "label": _("Employee Email id"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "production_tl", "label": _("Production TL"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "operationn_manager", "label": _("Operations Manager"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "qa_tl", "label": _("QA TL"), "fieldtype": "Data", "width": 150 },
        {"fieldname": "qa_manager", "label": _("QA Manager"), "fieldtype": "Data", "width": 200 },
        {"fieldname": "dept_head", "label": _("Department Head"), "fieldtype": "Data", "width": 150 },         
    ]
    