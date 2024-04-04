import frappe
import json
from frappe import _
from frappe.desk.form.document_follow import follow_document
from frappe.desk.form.assign_to import format_message_for_assign_to,get
from frappe.desk.search import search_widget,build_for_autosuggest
from frappe.utils import unique,cstr,nowdate,now
from frappe.desk.doctype.notification_log.notification_log import enqueue_create_notification,\
	get_title, get_title_html
from frappe.utils import now
from wms.public.py.notification  import has_role_profile,make_system_notification
from wms.utils.common import manual_assignment,Caller

MD ="Medical Coder Flow"
def update_boot(boot):
    try:
        # user = frappe.get_doc('User',frappe.session.user)
        if frappe.session.user == "Administrator":
            data ={'role_profile':'Administrator'}
            boot.update({"wms":data})
        else:
            data ={
                'role_profile':frappe.get_doc('Employee',{'user_id':frappe.session.user}).role if frappe.db.exists("Employee",{'user_id':frappe.session.user}) else None,
                # 'data_count':count[0]['count'] if count else 0,
                'emp': frappe.db.get_value('Employee',{'user_id':frappe.session.user}) if frappe.db.exists("Employee",{'user_id':frappe.session.user}) else None
                }
            boot.update({"wms":data})
    except Exception as e:
        print(e)
        frappe.log_error(e, "boot error")


@frappe.whitelist()
def add_multiple(args=None):    
    if not args:
        args = frappe.local.form_dict
    docname_list = json.loads(args['name'])
    assigned = False
    
    for docname in docname_list:
        if args['doctype'] == "Medical Coder Flow":
            hold_reason_value = frappe.db.get_value("Medical Coder Flow", docname, "hold_reason")
            technical_issue_value = frappe.db.get_value("Medical Coder Flow", docname, "technical_issue")
            if hold_reason_value:
                frappe.msgprint("Cannot assign/reassign as there is a Hold reason for the record "+ docname,raise_exception=False,indicator='red')
                continue
            if technical_issue_value:
                frappe.msgprint("Cannot assign/reassign as there is a <b>Technical Issue</b> for the record "+ docname,raise_exception=False,indicator='red')
                continue
        args.update({"name": docname})
        assigned = check_record(args)    
        if assigned:continue
        add(args)

    if assigned:
        frappe.msgprint("Record cannot be assigned to more than one user",raise_exception=False,indicator='red')

        
@frappe.whitelist()
def add(args=None,flag=0):
	"""add in someone's to do list
	args = {
	        "assign_to": [],
	        "doctype": ,
	        "name": ,
	        "description": ,
	        "assignment_rule":
	}

	"""
	if not args:
		args = frappe.local.form_dict
	users_with_duplicate_todo = []
	shared_with_users = []
	assigned = False
	user  = frappe.get_doc('User',frappe.session.user)
	assign =  frappe.parse_json(args.get("assign_to")) if flag==0 else args.get("assign_to")
	for assign_to in assign:
		if has_role_profile("QA Lead") and args["doctype"]==MD:
			assign_to = frappe.db.get_value('Employee',{'name':assign_to},'user_id')
		
		filters = {
			"reference_type": args["doctype"],
			"reference_name": args["name"],
			"status": "Open",
			"allocated_to": assign_to
		}
		if frappe.get_all("ToDo", filters=filters):
			users_with_duplicate_todo.append(assign_to)
		else:
			from frappe.utils import nowdate,now

			if not args.get("description"):
				args["description"] = _("Assignment for {0} {1}").format(args["doctype"], args["name"])
			assigned = check_record(args)
			if assigned:continue
			update_data(args,assign_to)
			assigned_by(args,assign_to)
			if has_role_profile("QA Lead") and args['doctype']=="Medical Coder Flow":continue
				
			d = create_todo(assign_to,args,user,flag)
			if d:
				# set assigned_to if field exists
				if frappe.get_meta(args["doctype"]).get_field("assigned_to"):
					frappe.db.set_value(args["doctype"], args["name"], "assigned_to", assign_to)

					# set assign to date time custom field if assign_to, doctype and role
					if args["doctype"] == 'Bulk Upload Activities' and has_role_profile(["Production TL","Administrator"]):
						frappe.db.set_value(args["doctype"], args["name"], "assign_to_datetime", now())
						update_bulkUploadActivity_assignTable(args["doctype"],args["name"],assign_to)
					
				doc = frappe.get_doc(args["doctype"], args["name"])

				# if assignee does not have permissions, share
				if not frappe.has_permission(doc=doc, user=assign_to):
					frappe.share.add(doc.doctype, doc.name, assign_to)
					shared_with_users.append(assign_to)

				# make this document followed by assigned user
				follow_document(args["doctype"], args["name"], assign_to)

				# notify
				notify_assignment(
					d.assigned_by,
					d.allocated_to,
					d.reference_type,
					d.reference_name,
					action="ASSIGN",
					description=args.get("description"),
				)
			else:
				frappe.msgprint(
					title='Warning',
					msg='Cannot assign Inactive Records',
					indicator= 'orange'
				)
				continue


	if shared_with_users:
		user_list = format_message_for_assign_to(shared_with_users)
		frappe.msgprint(
			_("Shared with the following Users with Read access:{0}").format(user_list, alert=True)
		)

	if users_with_duplicate_todo:
		user_list = format_message_for_assign_to(users_with_duplicate_todo)
		frappe.msgprint(_("Already in the following Users ToDo list:{0}").format(user_list, alert=True))
	
	if assigned:
		frappe.msgprint("Record cannot be assigned to more than one user",raise_exception=True)
	return get(args)

def update_bulkUploadActivity_assignTable(doctype,name,assign_to):
	doc = frappe.get_doc(doctype,name)
	doc.append("medical_coder_reassign_table",{
					"team_lead":frappe.session.user,
					"datetime":now(),
					"medical_coder":assign_to,
					})
	doc.activity_status ="Picked"
	doc.save()
	frappe.db.commit()

def update_data(args,allocated_to):
	try:
		# user = frappe.get_doc('User',frappe.session.user)
		if args["doctype"]=="Medical Coder Flow" and has_role_profile("QA Lead"):
			emp = frappe.db.get_value('Employee',{'user_id':allocated_to},'name')
			workflow_state,name,error_marked = frappe.db.get_value(args["doctype"], args["name"], ['workflow_state','name','error_marked'])
			if (error_marked in ["Yes","No"]):
				frappe.throw(msg=f"QA has taken action on this form <b>{name}</b>, Reassignment cannot be performed")
				return

			frappe.db.sql(""" update `tabMedical Coder Flow` set employee ="{0}",hold_reason = "" where name="{1}"  """.format(emp,args["name"]))
			medical_doc = frappe.get_doc(args["doctype"],args["name"])
			medical_doc.append("qa_reassign_table",{
								"qa_lead":frappe.session.user,
								"datetime":now(),
								"qa":allocated_to,
								"workflow_state":medical_doc.workflow_state
							})
			medical_doc.save(ignore_permissions=True)
			
		return
	except Exception as e:
		print(e)




def get_user(doctype,reference_doctype):
	try:
		user_1=frappe.session.user
		sql = frappe.db.sql(""" select distinct(for_value) from `tabUser Permission` where user="{0}" and allow="User" """.format(user_1),as_dict = True)
		users =[user['for_value'] for user in sql if user['for_value'] != user_1]

		if doctype == "User" and reference_doctype is None:
			users =[user['for_value'] for user in sql if "Medical Coder" in frappe.get_roles(user["for_value"])]

		return users
	except Exception as e:
		print(e)

def get_employee():
	try:
		user=frappe.session.user
		name = frappe.db.get_value('Employee', {'user_id': user}, ['name'])
		sql = frappe.db.sql(""" select distinct(for_value) from `tabUser Permission` where user="{0}" and allow="Employee" and for_value != "{1}" """.format(user,name),as_dict = True)
		curr_emp =[user['for_value'] for user in sql ]
		return curr_emp
	except Exception as e:
		print(e)

def assigned_by(args,assigned_by):
	try:
		# user = frappe.get_doc('User',frappe.session.user)
		if args["doctype"] == "Medical Coder Flow" and has_role_profile("QA Inventory Allocation"):
			frappe.db.sql(""" update `tabMedical Coder Flow` set assigned_by="{0}",hold_reason = "" where name="{1}" """.format(assigned_by,args["name"]))

			medical_doc = frappe.get_doc(args["doctype"],args["name"])
			medical_doc.append("qa_lead_assign_table",{
									"assigned_by":frappe.session.user,
									"assigned_to":assigned_by,
									"datetime":now(),
									"workflow":medical_doc.workflow_state
								})
			medical_doc.save(ignore_permissions=True)
			qa_lead_notification(args["name"],assigned_by,args["doctype"])
		return 
	except Exception as e:
		print(e)

def qa_lead_notification(name,assigned_by,doctype):
	message = f"{frappe.session.user} has assigned {name} to you"
	subject = "Work Allocation Assigned"
	user_list = [assigned_by]
	make_system_notification(user_list, message, doctype, name,subject)
	# frappe.msgprint(msg=f"Assigned a new task {name} to {assigned_by}",title='Assigned QATL')	

@frappe.whitelist()
def search_link(doctype, txt, query=None, filters=None, page_length=300, searchfield=None, reference_doctype=None, ignore_user_permissions=False):
	search_widget(doctype, txt.strip(), query, searchfield=searchfield, page_length=page_length, filters=filters, reference_doctype=reference_doctype, ignore_user_permissions=ignore_user_permissions)
	frappe.response['results'] = build_for_autosuggest(frappe.response["values"],doctype,reference_doctype)
	del frappe.response["values"]

def build_for_autosuggest(res,doctype,reference_doctype):
	results = []

	if frappe.session.user == "Administrator":
		for r in res:
			results.append({"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])})
		return results

	if has_role_profile("Super Admin"):
		for r in res:
			results.append({"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])})
		return results

	if has_role_profile("WMS Manager"):
		for r in res:
			results.append({"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])})
		return results

	user  = frappe.get_doc('User',frappe.session.user)
	if has_role_profile("Production TL") and doctype=='User' and reference_doctype!="Bulk Upload Activities":
		return filter_user(res,results,doctype,reference_doctype)
	# elif has_role_profile("QA Inventory Allocation"):
	# 	return qa_lead_filter(res,results)
	else:
		if has_role_profile("QA Lead") and doctype == "User" and reference_doctype == "Medical Coder Flow":
			for r in res:
				results.append({"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])})
			return results

		for r in res:			
			if has_role_profile("QA Lead") and doctype == "User":
				cur_emp = get_employee()
				out = {"value":frappe.db.get_value('Employee',{'user_id':r[0]},'name') or None, "description": ", ".join(unique(cstr(d) for d in r if d)[1:])}
				if out['value'] in cur_emp:
					results.append(out)
			else:
				results.append({"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])})
		return results

# def qa_lead_filter(res,results):
# 	try:
# 		qa_lead_user = frappe.db.sql(f"select user_id from `tabEmployee` where role = 'QA Lead'",as_dict = True)
# 		qa_lead_user = [user["user_id"] for user in qa_lead_user]
# 		for r in res:
# 			if r[0] in qa_lead_user:
# 				out = {"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])}
# 				results.append(out)
# 		return results
# 	except Exception as e:
# 		print(e)
			

def filter_user(res,results,doctype,reference_doctype):
	try:
		user = get_user(doctype,reference_doctype)
		if len(res)>0:
			for r in res:
				if r[0] in user:
					out = {"value": r[0], "description": ", ".join(unique(cstr(d) for d in r if d)[1:])}
					results.append(out)
			return results
	except Exception as e:
		print(e)

def check_record(args):
	try:
		user = frappe.get_doc('User',frappe.session.user)
		if frappe.db.exists('ToDo',{'reference_name':args["name"],'reference_type':args['doctype'],'status':['!=','Cancelled']}) and (args["doctype"]!="Medical Coder Flow" and not has_role_profile("QA Lead")):
			return True	
		elif frappe.db.exists('ToDo',{'reference_name':args["name"],'reference_type':args['doctype'],'status':['!=','Cancelled']}) and (args["doctype"] == MD and has_role_profile(["QA Inventory Allocation","Administrator"])):
			return True
		return False
	except Exception as e:
		print(e)




def create_todo(assign_to,args,user,flag=0):
	try:
		if args['doctype'] in ["Bulk Upload Activities","Medical Coder Flow"]:
			validate_count(assign_to,flag)
			bulk_doc = frappe.get_doc(args['doctype'],args['name'])
			if args['doctype'] == "Bulk Upload Activities" and bulk_doc.status == "Inactive":
				return None
		
			d = frappe.get_doc(
				{
					"doctype": "ToDo",
					"allocated_to": assign_to,
					"reference_type": args["doctype"],
					"reference_name": args["name"],
					"description": args.get("description"),
					"priority": args.get("priority", "Medium"),
					"status": "Open",
					"date": args.get("date", nowdate()),
					"assigned_by": args.get("assigned_by", frappe.session.user),
					"assignment_rule": args.get("assignment_rule"),

					"mr_number" :bulk_doc.mr_number,
					"arrived_date":bulk_doc.arrived_date,
					"assessment_type":bulk_doc.assessment_type,
					"payor_type":bulk_doc.payor_type

				}
					
				).insert(ignore_permissions=True)
			return d
	except Exception as e:
		print(e)

def notify_assignment(
	assigned_by, allocated_to, doc_type, doc_name, action="CLOSE", description=None
):
	"""
	Notify assignee that there is a change in assignment
	"""
	if not (assigned_by and allocated_to and doc_type and doc_name):
		return

	# return if self assigned or user disabled
	if assigned_by == allocated_to or not frappe.db.get_value("User", allocated_to, "enabled"):
		return

	# Search for email address in description -- i.e. assignee
	user_name = frappe.get_cached_value("User", frappe.session.user, "full_name")
	title = get_title(doc_type, doc_name)
	description_html = f"<div>{description}</div>" if description else None

	if action == "CLOSE":
		subject = _("Your assignment on {0} {1} has been removed by {2}").format(
			frappe.bold(_(doc_type)), get_title_html(title), frappe.bold(user_name)
		)
	else:
		user_name = frappe.bold(user_name)
		document_type = frappe.bold(_(doc_type))
		title = get_title_html(title)
		
		if has_role_profile(["Production TL","Administrator"]):
			return
		if has_role_profile("QA Inventory Allocation"):
			return 
		else:
			subject = _('{0} assigned a new task {2} to you').format(user_name, document_type, title)
				
	notification_doc = {
		"type": "Assignment",
		"document_type": doc_type,
		"subject": subject,
		"document_name": doc_name,
		"from_user": frappe.session.user,
		"email_content": description_html,
	}

	enqueue_create_notification(allocated_to, notification_doc)


def get_assignments(dt, dn):
	if not dt.has_permission("read"):
		raise frappe.PermissionError
	cl = frappe.get_all("ToDo",
		fields=['name', 'allocated_to', 'description', 'status'],
		filters={
			'reference_type': dt,
			'reference_name': dn,
			'status': ('!=', 'Cancelled'),
		})

	return cl


@frappe.whitelist()
def remove(doctype, name, assign_to):
	# case when form is medical coder form created or not
	check_medical_coder_remove(doctype,name,assign_to)
	return set_status(doctype, name, assign_to, status="Cancelled")


def check_medical_coder_remove(doctype,name,assign_to):
	if doctype == "Bulk Upload Activities":
		if frappe.db.exists ("Medical Coder Flow",name):
			mr_number = frappe.db.get_value("Medical Coder Flow", name, 'mr_number')
			frappe.throw(msg=f"Work Allocation Form <b>{mr_number}</b> is already created you can not Reassign")
			return
			

def set_status(doctype, name, assign_to, status="Cancelled"):
	"""remove from todo"""
	try:
		

		todo = frappe.db.get_value(
			"ToDo",
			{
				"reference_type": doctype,
				"reference_name": name,
				"allocated_to": assign_to,
				"status": ("!=", status),
			},
		)
		if todo:
			todo = frappe.get_doc("ToDo", todo)
			todo.status = status
			todo.save(ignore_permissions=True)
			if (not has_role_profile("QA Inventory Allocation") or frappe.session.user == "Administrator") and doctype == MD:
				notify_assignment(todo.assigned_by, todo.allocated_to, todo.reference_type, todo.reference_name)
			if (has_role_profile("QA Inventory Allocation") or frappe.session.user == "Administrator") and doctype == MD:
				frappe.db.set_value(doctype, name, "assigned_by", None)
				# mr_number = frappe.db.get_value(doctype, name, 'mr_number')
				message = f" {name} Your assignment has been removed"
				user_list = [assign_to]
				subject = "Work Allocation Reassigned"
				make_system_notification(user_list, message, doctype, name,subject)
	except frappe.DoesNotExistError:
		pass

	# clear assigned_to if field exists
	if frappe.get_meta(doctype).get_field("assigned_to") and status == "Cancelled":
		# prodtl to mc
		# remove medical coder
		frappe.db.set_value(doctype, name, "assigned_to", None)
		mr_number = frappe.db.get_value(doctype, name, 'mr_number')
		message = f" {mr_number} Your assignment has been removed"
		user_list = [assign_to]
		subject = "Work Allocation Reassigned"
		make_system_notification(user_list, message, doctype, name,subject)

	return get({"doctype": doctype, "name": name})


# NOT USED ANYWHERE
@frappe.whitelist()
def notification_restrication(name = None,role_profile =None):
	if has_role_profile("QA"):
		data = frappe.db.sql(f"""SELECT name,email FROM `tabMedical Coder Flow` WHERE name = '{name}' """,as_dict = 1)
	elif has_role_profile("QA Lead"):
		data = frappe.db.sql(f"""SELECT name,assigned_by FROM `tabMedical Coder Flow` WHERE name = '{name}' """,as_dict = 1)
	return data

# NOT USED ANYWHERE
@frappe.whitelist()
def notification_restrication_for_mc(name = None,role_profile =None):
	if has_role_profile("Medical Coder"):
		data = frappe.db.sql(f"""SELECT name,assigned_to,mr_number FROM `tabBulk Upload Activities` WHERE name = '{name}' """,as_dict = 1)
	elif has_role_profile("Production TL"):
		data = frappe.db.sql(f"""SELECT name,assigned_manager,mr_number FROM `tabBulk Upload Activities` WHERE name = '{name}' """,as_dict = 1)
	return data



"""********Show the roles and modules Accessability according to Users********"""
@frappe.whitelist()
def get_roles_and_modules(user):
	from frappe.utils import flt, has_common
	roles = []
	modules = []
	settings = frappe.get_single("RedRoad Settings")
	if has_common(["Super Admin"], frappe.get_roles(user)):
		for row in settings.hr_roles_table:
			roles.append(row.roles)
		for row in settings.wms_roles_table:
			roles.append(row.roles)
	elif has_common(["HR Manager", "HR User"], frappe.get_roles(user)):
		for row in settings.hr_roles_table:
			roles.append(row.roles)
	elif has_common(["WMS Manager"], frappe.get_roles(user)):
		for row in settings.wms_roles_table:
			roles.append(row.roles)

	for row in settings.modules_table:
		modules.append(row.modules)
	return {"roles":roles, "modules":modules}

@frappe.whitelist()
def remove_multiple(doctype,data=None):
	from collections import deque
	from frappe import _
	removed_data,exist = deque(),deque()
	if data:
		data = frappe.parse_json(data)
		for d in data:
			if doctype == "Bulk Upload Activities" and frappe.db.exists ("Medical Coder Flow",d['name']):
				mr_number = frappe.db.get_value("Medical Coder Flow", d['name'], 'mr_number')
				exist.append(str(mr_number))
				continue
			if doctype == "Medical Coder Flow":
				hold_reason = frappe.db.get_value("Medical Coder Flow", d['name'], 'hold_reason')
				if hold_reason:
					exist.append(d['name'])
					continue
			set_status(doctype, d['name'], d['allocated_to'], status="Cancelled")
			removed_data.append(d['name'])
		if doctype == "Bulk Upload Activities" and exist:
			frappe.msgprint(_("Work Allocation Form is already created you can not Reassign:{0}").format("<br><br>" + "<br>".join(exist), alert=True))
		if doctype == "Medical Coder Flow" and exist:
			# raise ValueError('Cannot Remove assigned user as there is Hold Reason for the records')
			frappe.msgprint(_("Cannot Remove assigned user as there is Hold Reason for the records"))
		
		return removed_data



# @frappe.whitelist()
# def get_worksapce(doctype):
# 	workspace=frappe.db.sql("""SELECT a.name From `tabWorkspace` a LEFT JOIN `tabWorkspace Link` b on a.name=b.parent where b.link_to='{0}' and a.public=1 and a.name not in ('Home', 'ERPNext Settings', 'Tools')""".format(doctype), as_dict=1)
# 	return workspace[0].get('name') if workspace else ""

def validate_count(assign_to,flag):
	roles =  frappe.get_roles(assign_to)
	if 'Medical Coder' in roles and flag==0:
		manual_assignment(name=Caller.CODER_NAME.value,key='CODER',assign_to=assign_to)
	elif 'QA' in roles and flag==0:
		manual_assignment(name=Caller.QA_NAME.value,key='QA',assign_to=assign_to)
