import frappe
import json
t_d = frappe.qb.DocType('ToDo')

@frappe.whitelist()
def remove(doctype, name, assign_to):
	return set_status(doctype, name, assign_to, status="Cancelled")

def set_status(doctype, name, assign_to, status="Cancelled"):
	"""remove from todo"""
	try:
		todo = frappe.db.get_value("ToDo", {"reference_type":doctype,
		"reference_name":name, "allocated_to":assign_to, "status": ('!=', status)})
		if todo:
			todo = frappe.get_doc("ToDo", todo)
			todo.status = status
			todo.save(ignore_permissions=True)

			notify_assignment(todo.assigned_by, todo.allocated_to, todo.reference_type, todo.reference_name)
	except frappe.DoesNotExistError:
		pass

	# clear assigned_to if field exists
	if frappe.get_meta(doctype).get_field("assigned_to") and status=="Cancelled":
		frappe.db.set_value(doctype, name, "assigned_to", None)

	return get({"doctype": doctype, "name": name})

def get(args=None):
	"""get assigned to"""
	if not args:
		args = frappe.local.form_dict

	return frappe.get_all('ToDo', fields=['allocated_to', 'name'], filters=dict(
		reference_type = args.get('doctype'),
		reference_name = args.get('name'),
		status = ('!=', 'Cancelled')
	), limit=5)

@frappe.whitelist()
def get_assignments(dt, dn):
	dn = json.loads(dn)
	if dn:
		for n in dn:
			check_perm(dt,n)

			q = (
				frappe.qb.from_(t_d)
				.select(t_d.allocated_to,t_d.description,t_d.status)
				.where(
					(t_d.reference_type==dt)&
					(t_d.reference_name==n)&
					(t_d.status!='Cancelled')
				))
			try:
				r = frappe.db.sql(str(q),as_dict=1)
				if r:
					r[0].update({'name':n})
					yield(r[0])
			except frappe.DoesNotExistError as e:
				frappe.logger().debug({'error':frappe.utils.get_traceback(e)})
		
def check_perm(dt,dn):
	doc =  frappe.get_doc(dt,dn)
	if not doc.has_permission("read"):
			raise frappe.PermissionError


@frappe.whitelist()
def get_user_list(roles):
	roles = json.loads(roles)
	roles = ','.join([ '"%s"'%name for name in roles ])
	query = f"""
		SELECT name, full_name 
		FROM tabUser 
		WHERE name IN (
		SELECT parent FROM `tabHas Role`
		WHERE role in ({roles})) 
		and enabled = '1' and name NOT IN (
		SELECT parent FROM `tabHas Role`
		WHERE role in ('System Manager','Super Admin','WMS Manager'))
		"""
	
	options = frappe.db.sql(query, as_dict=True)
	users = [row.get('name') for row in options]
	return users

@frappe.whitelist()
def get_user_tl_list(doctype, txt, searchfield, start, page_len, filters):
	conditions = ''
	if txt:
		conditions = f" AND ( email LIKE '%{txt}%' or full_name LIKE '%{txt}%') "
	roles = filters.get("roles")
	query = f"""
		SELECT name,full_name
		FROM tabUser 
		WHERE name IN (
		SELECT parent FROM `tabHas Role`
		WHERE role = '{roles}')
		and enabled = '1' {conditions} and name != '{frappe.session.user}' and name NOT IN (
		SELECT parent FROM `tabHas Role`
		WHERE role in ('System Manager','Super Admin','WMS Manager'))
		"""
	return frappe.db.sql(query, as_list=True)
	
	