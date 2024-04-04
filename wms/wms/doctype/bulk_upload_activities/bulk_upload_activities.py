# Copyright (c) 2022, Manju and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import datetime
from frappe.desk.form.assign_to import remove
import json
from wms.public.py.notification  import make_system_notification,has_role_profile
from frappe.utils import format_date,format_time,now,get_url_to_list
from collections import deque
from wms.utils.common import decrement_activity_count


class BulkUploadActivities(Document):

    # Delete all links related to add or manage activity
    def on_trash(self):
        if frappe.session.user == "Administrator":
            frappe.db.delete("OASIS Child MItem",{"parent":self.name})
            frappe.db.delete("Secondary Diagnostics",{"parent":self.name})
            frappe.db.delete("ICD Code QA",{"parent":self.name})
            frappe.db.delete("ICD",{"parent":self.name})
            frappe.db.delete("Medical Coder Flow",{"name":self.name})
            frappe.db.delete("QA Weightage",{"medical_coder_flow":self.name})
            frappe.db.delete("Work Allocation Activity History",{"name":self.name})
            frappe.db.delete("ToDo",{"reference_name":self.name})
            frappe.db.delete("Version",{"docname":self.name})
            frappe.db.delete("Workflow Action", {"reference_doctype": self.doctype, "reference_name": self.name})
            frappe.db.delete("Workflow Action", {"reference_doctype": 'Medical Coder Flow', "reference_name": self.name})
            frappe.db.delete("Work Allocation Activity History",{"work_allocation":self.name})
            frappe.db.delete("Activit History",{"parent":self.name})
            frappe.db.sql(f" DELETE FROM `tabNotification Log` where document_type in ('Bulk Upload Activities','Medical Coder Flow') and document_name = '{self.name}' ")
    
    def onload(self):
        pass
        # self.check_user_permission()
        
    def check_user_permission(self):
        if has_role_profile("Production TL") and frappe.session.user != "Administrator"  and not has_role_profile(["WMS Manager","Super Admin"]):
            if frappe.session.user != self.assigned_manager:
               message = f"Restricted Access:"
               frappe.throw(f"{message} \
                            <br> <br> <a href='{get_url_to_list('Bulk Upload Activities')}'>Visit Add or Manage Activity List View </a> ")
               
        if has_role_profile("Medical Coder") and frappe.session.user != "Administrator" and not has_role_profile(["WMS Manager","Super Admin"]):
            if frappe.session.user != self.assigned_to:
               message = f"Restricted Access:"
               frappe.throw(f"{message}\
                            <br> <br> <a href='{get_url_to_list('Bulk Upload Activities')}'>Visit Add or Manage Activity List View </a> ")


    def before_save(self):
        # set creation of activity 
        if self.is_new():
            from datetime import datetime

            self.creation1 = datetime.now()
            self.create_workallocation_history()

        from frappe.utils import now, get_datetime
        from datetime import datetime

        if self.arrived_date:
            arrived_datetime = frappe.utils.get_datetime(self.arrived_date)
            # arr_time = datetime.strptime(arrived_datetime, '%Y-%m-%d %H:%M:%S')
            current_datetime = datetime.strptime(now(), "%Y-%m-%d %H:%M:%S.%f")
            age_delta = abs(current_datetime - arrived_datetime)
            age_days = age_delta.days
            age_hours = age_delta.seconds // 3600
            age_str = "{} days, {} hours".format(age_days, age_hours)
            self.age_of_chart = age_str
            
        self.check_production_tl_before_creation_work_allocation()
        self.update_production_tl_assign_reassign()
        self.check_patient_name()
        self.duplicate_records()
        self.update_assigned_mc()
        
        

    def on_update(self):
        # self.update_workallocation_history()
        self.update_medical_coder()
        self.update_activity_history()
        
                

    def update_assigned_mc(self):
        if self.get_doc_before_save() and self.get_doc_before_save().assigned_to != self.assigned_to:
            self.append('medical_coder_reassign_table',{
                "medical_coder":self.assigned_to,
                "datetime":now(),
                "team_lead":frappe.session.user
            })

    
    def update_medical_coder(self):
        if self.assigned_to and self.get_doc_before_save().assigned_to != self.assigned_to and frappe.db.exists("User",self.assigned_to):
            #Change mc name in ToDO
            if frappe.db.exists("ToDo", {'reference_name': self.work_allocation_activity_history}):
                todo_doc = frappe.get_doc("ToDo", {'reference_name': self.work_allocation_activity_history})
                todo_doc.allocated_to = self.assigned_to
                todo_doc.save()

            #Changes mc name in Work Allocation
            if frappe.db.exists('Medical Coder Flow', {'patient_reference_details': self.name}):
                wk_doc = frappe.get_doc('Medical Coder Flow', {'patient_reference_details': self.name})
                wk_doc.codername = self.assigned_to
                wk_doc.coder_name = self.assigned_to
                wk_doc.save(ignore_permissions=True)
                frappe.db.set_value("Medical Coder Flow", wk_doc.name, 'owner', self.assigned_to, update_modified=True)
            
            #Changes mc name in Activity History
            if frappe.db.exists('Work Allocation Activity History', {'mr_number': self.mr_number, 'payor_type': self.payor_type, 'assessment_type':self.assessment_type}):
                wh_doc = frappe.get_doc('Work Allocation Activity History', {'mr_number': self.mr_number, 'payor_type': self.payor_type, 'assessment_type':self.assessment_type})
                wh_doc.coder_name = self.assigned_to
                wh_doc.save(ignore_permissions=True)

            #Changes mc name in QA Weightage
            if frappe.db.exists('QA Weightage', {'mr_number': self.mr_number, 'payor_type': self.payor_type, 'assessment_type':self.assessment_type}):
                qaw_doc = frappe.get_doc('QA Weightage', {'mr_number': self.mr_number, 'payor_type': self.payor_type, 'assessment_type':self.assessment_type})
                qaw_doc.coder_name = self.assigned_to
                qaw_doc.save()

    def update_production_tl_assign_reassign(self):
        if self.get_doc_before_save() and self.get_doc_before_save().assigned_manager != self.assigned_manager:
            self.append('production_tl_reassign_table',{
                "team_leadinventry_user":frappe.session.user,
                "datetime":now(),
                "team_lead":self.assigned_manager
            })
            # Cancelled Notification- “<MR Number> - has been removed“
            # Case: Inventory User to ProdTL
            if has_role_profile("Production Inventory Allocation"):
                message = f"{self.mr_number} - Your assignment has been removed"
                user_list = [self.get_doc_before_save().assigned_manager]
                subject = "Work Allocation Reassigned"
                make_system_notification(user_list, message, self.doctype, self.name,subject)

    # validation
    def check_production_tl_before_creation_work_allocation(self):
        if self.get_doc_before_save() and self.get_doc_before_save().assigned_manager != self.assigned_manager:
            if frappe.db.exists ("Medical Coder Flow",self.name):
                mr_number = frappe.db.get_value('Medical Coder Flow', self.name, 'mr_number')
                frappe.throw(msg=f"Work Allocation <b>{mr_number}</b> is already Created So you Cannot change Production TL")
            else:
                remove(self.doctype, self.name, self.assigned_to)
                self.assigned_to = None


    def update_workallocation_history(self):	
        if frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.name}):
            wah = frappe.get_doc("Work Allocation Activity History",self.name)
            wah.flags.ignore_permissions  = True
            wah.mr_number = self.mr_number
            wah.coder_name = self.assigned_to
            wah.payor_type = self.sub_payor_type
            wah.payor_type_hchb = self.payor_type
            wah.assessment_type = self.assessment_type
            wah.arrived_date = self.arrived_date
            # wah.wa_history = []
            # activities = []
            
            # activities.append({
            #     "activity" : "Add or Manage Activity Creation",
            #     "milestones": format_date(self.creation,format_string = "dd-mm-yyyy" + " " + format_time(self.creation,format_string = "HH:mm:ss")),
            #     "user" : self.owner
            # })

            if self.assigned_manager and self.get_doc_before_save().assigned_manager != self.assigned_manager:
                if len(self.production_tl_reassign_table) > 1:
                    wah.append("wa_history", {
                        "activity": "Reassign Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                        "milestones": format_date(self.modified,format_string = "dd-mm-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                        "user": self.assigned_manager
                    })
        
            if not self.is_new() and self.assigned_to and len(self.medical_coder_reassign_table) == 1:
                existing_activity = []
                if len(wah.wa_history) > 1:
                    for row in wah.wa_history:
                        existing_activity.append(row.activity.strip())

                if existing_activity and "Add or Manage Activity assign" not in existing_activity:
                    wah.append("wa_history", {
                            "activity": "Add or Manage Activity assign",
                            "milestones": format_date(self.modified,format_string = "dd-mm-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user": self.assigned_to 
                        })

            if self.assigned_to and self.get_doc_before_save().assigned_to != self.assigned_to and frappe.db.exists("User",self.assigned_to):
                if len(self.medical_coder_reassign_table) > 1:
                    wah.append("wa_history", {
                        "activity": "Add or Manage Activity Reassigned",
                        "milestones": format_date(self.modified,format_string = "dd-mm-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                        "user": self.assigned_to 
                    })

                    message = f"{self.mr_number} - Your assignment has been removed"
                    user_list = [self.get_doc_before_save().assigned_to]
                    subject = "Work Allocation Reassigned"
                    make_system_notification(user_list, message, self.doctype, self.name,subject)


            # update_productiontl_history(self.production_tl_reassign_table,activities)
            # update_medical_coder_history(self.medical_coder_reassign_table,activities)
            # sorted_activities = sorted(activities, key=lambda x: datetime.datetime.strptime(x['milestones'], '%d-%m-%Y %H:%M:%S'))

            # for data in sorted_activities:
            #     wah.append("wa_history",data)
            wah.save()
            wah.reload()
    
    def create_workallocation_history(self):
        self.append('production_tl_reassign_table',{
                "team_leadinventry_user":frappe.session.user,
                "datetime":now(),
                "team_lead":self.assigned_manager
            })	

        if not frappe.db.exists ("Work Allocation Activity History",{'work_allocation':self.name}):
            wah = frappe.new_doc("Work Allocation Activity History")
            wah.flags.ignore_permissions  = True
            wah.work_allocation = self.name
            wah.mr_number = self.mr_number
            wah.arrived_date = now()
            wah.payor_type = self.sub_payor_type
            wah.payor_type_hchb = self.payor_type
            wah.assessment_type = self.assessment_type		
            wah.append("wa_history",{
							"activity" : "Add or Manage Activity Creation",
							"milestones": format_date(self.creation,format_string = "mm-dd-yyyy" + " " + format_time(self.creation,format_string = "HH:mm:ss")),
							"user" : self.owner
						})
            if self.assigned_manager:
                wah.append("wa_history",{
                                "activity" : "Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                                "milestones": format_date(self.creation,format_string = "mm-dd-yyyy" + " " + format_time(self.creation,format_string = "HH:mm:ss")),
                                "user" : self.assigned_manager
                            })
            wah.save()
            wah.reload()
            self.work_allocation_activity_history = wah.name
    
    def update_activity_history(self):
        if frappe.db.exists("Work Allocation Activity History", {'name': self.name}):
            wah = frappe.get_doc("Work Allocation Activity History",self.name)
            wah.flags.ignore_permissions  = True
            wah.mr_number = self.mr_number
            wah.coder_name = self.assigned_to
            wah.payor_type = self.sub_payor_type
            wah.payor_type_hchb = self.payor_type
            wah.assessment_type = self.assessment_type
            wah.arrived_date = self.arrived_date

            if wah.wa_history:
                activity_list = []
                for activity in wah.wa_history:
                    activity_list.append(activity.activity.strip())
            

            if self.get_doc_before_save():
                if self.assigned_manager and "Add or Manage Activity Assign to L1 Supervisor(Production TL)" not in activity_list:
                    wah.append("wa_history",{
                            "activity" : "Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_manager
                        })
                
                if self.get_doc_before_save().assigned_manager != self.assigned_manager and "Add or Manage Activity Assign to L1 Supervisor(Production TL)" in activity_list:
                    wah.append("wa_history",{
                            "activity" : "Reassigned Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_manager
                        })
                    
                if self.assigned_to and "Add or Manage Activity assign" not in activity_list:
                        wah.append("wa_history",{
                            "activity" : "Add or Manage Activity assign",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_to
                        })
                
                if self.get_doc_before_save().assigned_to != self.assigned_to and "Add or Manage Activity assign" in activity_list:
                    wah.append("wa_history",{
                            "activity" : "Reassigned Add or Manage Activity",
                            "milestones": format_date(self.modified,format_string = "mm-dd-yyyy" + " " + format_time(self.modified,format_string = "HH:mm:ss")),
                            "user" : self.assigned_to
                        })
            
            wah.save()
            wah.reload()
    

    def check_patient_name(self):
        import re

        patient_name_pattern = r'^[a-zA-Z][a-zA-Z.,\s]*$'
        if not re.match(patient_name_pattern, self.patient_name):
            frappe.throw("<b>Patient Name</b>: Should start with an alphabet and only contain Alphabets, Commas, Space, and Period.")

    def duplicate_records(self):
        duplicate_count = frappe.db.count("Bulk Upload Activities", {
            "mr_number": self.mr_number,
            "arrived_date": self.arrived_date,
            "payor_type": self.payor_type,
            "assessment_type": self.assessment_type,
            "name": ("!=", self.name) if self.name else None
        })
        if duplicate_count == 1:
            frappe.throw("Record Already Existing")

@frappe.whitelist()			
def get_production_tl(doctype, txt, searchfield, start, page_len, filters):
    conditions = ''
    if txt:
        conditions = f" AND (u.email LIKE '%{txt}%' or u.full_name LIKE '%{txt}%') "
    return frappe.db.sql(f"select u.email,u.full_name from `tabUser` u INNER JOIN `tabEmployee` e ON  u.name = e.user_id where e.role = 'Production TL' AND e.status = 'Active' {conditions}",as_list = True)
       
        
from frappe.desk.doctype.bulk_update.bulk_update import submit_cancel_or_update_docs
@frappe.whitelist()
def bulk_update_production_tl(doctype,docnames,data):
    data = json.loads(data)
    submit_cancel_or_update_docs(doctype,docnames,action="update",data=data)

@frappe.whitelist()
def bulk_update_medical_coder(doctype,docnames,data):
    if doctype == "Bulk Upload Activities":
        docnames = json.loads(docnames)
        data = json.loads(data)
        old_users = deque()
        if len(docnames) > 1:
            flag=False
            for doc in docnames:
                wk_doc = frappe.get_doc("Bulk Upload Activities",doc)
                old_users.append(wk_doc.assigned_to)
                if frappe.db.exists('Medical Coder Flow', {'patient_reference_details': wk_doc.name}):
                    wa_doc = frappe.get_doc('Medical Coder Flow', {'patient_reference_details': wk_doc.name})
                    if wa_doc.workflow_state == "Chart Locked":
                        flag=True
                        frappe.throw(f"Cannot Reassign Chart Locked record <b>{doc}</b>")
                if not wk_doc.assigned_to:
                    flag = True
                    frappe.throw(f"Cannot Reassign record <b>{doc}</b> as it is not assigned to anyone yet")
                if wk_doc and wk_doc.assigned_to == data['assigned_to']:
                    flag=True
                    frappe.throw(f"Cannot Reassign record <b>{doc}</b> to same medical coder")
            if not flag:
                submit_cancel_or_update_docs(doctype,docnames,action="update",data=data)
                decrement_activity_count(old_users=old_users,new_user=data['assigned_to'],name='activity_count',key="CODER")
        if len(docnames) == 1:
            wk_doc = frappe.get_doc("Bulk Upload Activities",docnames[0])
            old_users.append(wk_doc.assigned_to)
            if frappe.db.exists('Medical Coder Flow', {'patient_reference_details': wk_doc.name}):
                wa_doc = frappe.get_doc('Medical Coder Flow', {'patient_reference_details': wk_doc.name})
                if wa_doc.workflow_state == "Chart Locked":
                    frappe.throw(f"Cannot Reassign Chart Locked record <b>{docnames[0]}</b>")
            if not wk_doc.assigned_to:
                frappe.throw(f"Cannot Reassign record <b>{docnames[0]}</b> as it is not assigned to anyone yet")
            if wk_doc and wk_doc.assigned_to == data['assigned_to']:
                frappe.throw(f"Cannot Reassign record <b>{docnames[0]}</b> to same medical coder")
            else:
                submit_cancel_or_update_docs(doctype,docnames,action="update",data=data)
                decrement_activity_count(old_users=old_users,new_user=data['assigned_to'],name='activity_count',key="CODER")
    else:
        data = json.loads(data)
        submit_cancel_or_update_docs(doctype,docnames,action="update",data=data)
        

def update_productiontl_history(table,activities):
    for i,value in enumerate(table):
        if i == 0:
            activities.append({
                "activity" : "Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                "milestones": format_date(value.datetime,format_string = "dd-mm-yyyy" + " " + format_time(value.datetime,format_string = "HH:mm:ss")),
                "user" : value.team_lead
            })
        else:
            activities.append({
                "activity" : " Reassign Add or Manage Activity Assign to L1 Supervisor(Production TL)",
                "milestones": format_date(value.datetime,format_string = "dd-mm-yyyy" + " " + format_time(value.datetime,format_string = "HH:mm:ss")),
                "user" : value.team_lead
            })

def update_medical_coder_history(table,activities):
    for i, value in enumerate(table):
        if i == 0:
            activities.append({
                "activity": "Add or Manage activity assign",
                "milestones":format_date(value.datetime,format_string = "dd-mm-yyyy" + " " + format_time(value.datetime,format_string = "HH:mm:ss")),
                "user": value.medical_coder
            })
        else:
            activities.append({
                "activity": "Add or Manage activity Reassign",
                "milestones":format_date(value.datetime,format_string = "dd-mm-yyyy" + " " + format_time(value.datetime,format_string = "HH:mm:ss")),
                "user": value.medical_coder
            })


@frappe.whitelist()
def get_mc_list(doctype, txt, searchfield, start, page_len, filters):
    if has_role_profile(["WMS Manager","Super Admin"]):
        mc_list = frappe.db.sql(""" select u.name, u.full_name from `tabUser Permission` as up inner join `tabUser` as u ON u.name = up.for_value where up.applicable_for = 'Bulk Upload Activities' and EXISTS (select 1 from `tabHas Role` as hr where  hr.role = 'Medical Coder' and hr.parent = up.for_value)""",as_list=True)
        return mc_list

    else:
        mc_list = frappe.db.sql(""" select u.name, u.full_name from `tabUser Permission` as up inner join `tabUser` as u ON u.name = up.for_value where up.user = %s and up.applicable_for = 'Bulk Upload Activities' and EXISTS (select 1 from `tabHas Role` as hr where  hr.role = 'Medical Coder' and hr.parent = up.for_value)""", frappe.session.user, as_list=True)
        return mc_list

