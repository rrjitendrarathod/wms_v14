import frappe


def calculate_age():
    from datetime import datetime
    from frappe.utils import now, get_datetime
    ages = frappe.db.get_all("Bulk Upload Activities", filters={},fields= ["name", "arrived_date"])
    for age in ages:
        self = frappe.get_doc("Bulk Upload Activities", age.name, age.arrived_date)
        mc_status = frappe.db.get_value("Medical Coder Flow", {"name":self.name}, "chart_status")
        if self.arrived_date and (self.activity_status in ["Open", "Picked"] or mc_status != "Locked"):
            arrived_datetime = frappe.utils.get_datetime(self.arrived_date)
            # arr_time = datetime.strptime(arrived_datetime, '%Y-%m-%d %H:%M:%S')
            current_datetime = datetime.strptime(now(), "%Y-%m-%d %H:%M:%S.%f")
            print("Current_Datetime",current_datetime)
            age_delta = abs(current_datetime - arrived_datetime)
            age_days = age_delta.days
            age_hours = age_delta.seconds // 3600
            age_str = "{} days, {} hours".format(age_days, age_hours)    
            self.age_of_chart = age_str
            #self.reload()
            frappe.db.sql(""" update `tabBulk Upload Activities` set age_of_chart="{0}" where name ="{1}" """.format(age_str,age.name))


def calculate_age_mc():
    from datetime import datetime
    from frappe.utils import now, get_datetime
    ages = frappe.db.get_all("Medical Coder Flow", filters={'chart_status': ['not in',['Locked']]},fields= ["name","arrived_date"])
    for age in ages:
        if age.arrived_date:
            arrived_datetime = frappe.utils.get_datetime(age.arrived_date)
            current_datetime = datetime.strptime(now(), "%Y-%m-%d %H:%M:%S.%f")
            age_delta = abs(current_datetime - arrived_datetime)
            age_days = age_delta.days
            age_hours = age_delta.seconds // 3600
            age_str = "{} days, {} hours".format(age_days, age_hours)
            age.age_of_chart = age_str
            frappe.db.sql(""" update `tabMedical Coder Flow` set age_of_chart="{0}" where name ="{1}" """.format(age_str,age.name))

def clear_activity_count():
    """clear add_or_manage activity count from cache"""
    users = frappe.db.get_all('Has Role',filters={'role': ['in',['Medical Coder','QA']],'parenttype':'User'},fields=['parent','role'])
    for user in users:
        if user.role=="Medical Coder":
            frappe.cache().hdel('activity_count',user.parent)
            frappe.cache().hdel('coder_count',user.parent)
        elif user.role=="QA":
            frappe.cache().hdel('qa_count',user.parent)

def tat_notification():
    from datetime import datetime
    from frappe.utils import now, get_datetime
    ages = frappe.db.get_all("Medical Coder Flow", filters={},fields= ["name", "modified"])
    for age in ages:
        self = frappe.get_doc("Medical Coder Flow", age.name, age.modified)
        modified_time = frappe.utils.get_datetime(self.modified)
        now_time = frappe.utils.get_datetime(now())
        time_difference = now_time-modified_time
        time_difference_hours = time_difference.seconds // 3600
        time_difference_mins = time_difference.seconds // 60
        time_difference_str = "{} hours".format(time_difference_hours)
        if time_difference_str == "24 hours":
            if self.workflow_state in ["Error Marked By QA","Coder Error Accepted by Department Head","Coder Error Accepted  by L1 supervisor-Post QA TL Feedback","Coder Error Accepted  by L1 supervisor - 1st Level Appeal","Coder Error Accepted  by L2 supervisor - 1st Level Appeal"]:
                user_list = [self.codername,self.team_lead]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.workflow_state in ["QA Error Accepted by QA TL","Coder Error Rejected by Department Head","QA Error Accept by QA Manager"]:
                user_list = [self.email,self.assigned_by]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.workflow_state in ["Coder 1st Level Appeal","QA Error Rejected  by QA TL"]:
                user_list = [self.team_lead,self.opm_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.workflow_state in ["Coder Error Rejected by L1 supervisor - 1st Level Appeal"]:
                user_list = [self.assigned_by,self.qam_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.chart_status in ["QA Appeal","Coder Error Rejected  by L2 supervisor - 1st Level Appeal"]:
                user_list = [self.qam_email,self.dh_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.chart_status in ["Coder Error Rejected  by L1 supervisor-Post QA TL Feedback"]:
                user_list = [self.opm_email,self.dh_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.chart_status in ["QA Error Rejected by QA Manager"]:
                user_list = [self.dh_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 24 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
        elif time_difference_str == "48 hours":
            if self.workflow_state in ["Coder Error Accepted by L2 Supervisor - 2nd Level Appeal"]:
                user_list = [self.codername,self.team_lead]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 48 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.chart_status in ["Coder Error Rejected by L2 Supervisor - 2nd Level Appeal"]:
                user_list = [self.qam_email, self.dh_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 48 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
            if self.chart_status in ["Coder 2nd Level Appeal"]:
                user_list = [self.opm_email,self.dh_email]
                subject = "Work Allocation"
                message = f"{self.name} - pending for action more than 48 hrs"
                frappe.sendmail(recipients=user_list, subject=subject, message=message)
