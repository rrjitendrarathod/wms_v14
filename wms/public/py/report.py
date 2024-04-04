import frappe
import json
import os
from frappe.modules import scrub, get_module_path
from frappe import _
from frappe.model.utils import render_include
from frappe.translate import send_translations
from frappe.utils import get_html_format
from six import string_types, iteritems
from wms.public.py.notification  import has_role_profile


from frappe.desk.query_report import get_prepared_report_result,generate_report_result
@frappe.whitelist()
def get_script(report_name):
	report = get_report_doc(report_name)
	module = report.module or frappe.db.get_value(
		"DocType", report.ref_doctype, "module"
	)

	is_custom_module = frappe.get_cached_value("Module Def", module, "custom")

	# custom modules are virtual modules those exists in DB but not in disk.
	module_path = '' if is_custom_module else get_module_path(module)
	report_folder = module_path and os.path.join(module_path, "report", scrub(report.name))
	script_path = report_folder and os.path.join(report_folder, scrub(report.name) + ".js")
	print_path = report_folder and os.path.join(report_folder, scrub(report.name) + ".html")

	script = None
	if os.path.exists(script_path):
		with open(script_path, "r") as f:
			script = f.read()
			script += f"\n\n//# sourceURL={scrub(report.name)}.js"

	html_format = get_html_format(print_path)

	if not script and report.javascript:
		script = report.javascript
		script += f"\n\n//# sourceURL={scrub(report.name)}__custom"

	if not script:
		script = "frappe.query_reports['%s']={}" % report_name

	# load translations
	if frappe.lang != "en":
		send_translations(frappe.get_lang_dict("report", report_name))

	return {
		"script": render_include(script),
		"html_format": html_format,
		"execution_time": frappe.cache().hget("report_execution_time", report_name)
		or 0,
	}

def get_report_doc(report_name):
	doc = frappe.get_doc("Report", report_name)
	doc.custom_columns = []
	if doc.report_type == "Custom Report":
		custom_report_doc = doc
		reference_report = custom_report_doc.reference_report
		doc = frappe.get_doc("Report", reference_report)
		doc.custom_report = report_name
		if custom_report_doc.json:
			data = json.loads(custom_report_doc.json)
			if data:
				doc.custom_columns = data["columns"]
		doc.is_custom_report = True

	check_permission(doc,report_name)
	return doc

def check_permission(doc,report_name):
	user  = frappe.get_doc('User',frappe.session.user)
	if report_name == "Medical Coder FLow" or report_name =="Add or Manage Activity" or report_name == "ToDo Report":
		if not doc.is_permitted():
			frappe.throw(
				_("You don't have access to Report: {0}").format(report_name),
				frappe.PermissionError,
			)

		if not frappe.has_permission(doc.ref_doctype, "report") and not has_role_profile("Medical Coder"):
			frappe.throw(
				_("You don't have permission to get a report on: {0}").format(
					doc.ref_doctype
				),
				frappe.PermissionError,
			)

		if doc.disabled:
			frappe.throw(_("Report {0} is disabled").format(report_name))
	else:
		trigger_standard_condition(doc,report_name)


def trigger_standard_condition(doc,report_name):
	if not doc.is_permitted():
		frappe.throw(
			_("You don't have access to Report: {0}").format(report_name),
			frappe.PermissionError,
		)

	if not frappe.has_permission(doc.ref_doctype, "report"):
		frappe.throw(
			_("You don't have permission to get a report on: {0}").format(
				doc.ref_doctype
			),
			frappe.PermissionError,
		)

	if doc.disabled:
		frappe.throw(_("Report {0} is disabled").format(report_name))

@frappe.whitelist()
@frappe.read_only()
def run(report_name, filters=None, user=None, ignore_prepared_report=False, custom_columns=None, is_tree=False, parent_field=None):
	report = get_report_doc(report_name)
	if not user:
		user = frappe.session.user
	check_report_perm(report)

	result = None

	if (
		report.prepared_report
		and not report.disable_prepared_report
		and not ignore_prepared_report
		and not custom_columns
	):
		if filters:
			if isinstance(filters, string_types):
				filters = json.loads(filters)

			dn = filters.get("prepared_report_name")
			filters.pop("prepared_report_name", None)
		else:
			dn = ""
		result = get_prepared_report_result(report, filters, dn, user)
	else:
		result = generate_report_result(report, filters, user, custom_columns, is_tree, parent_field)

	result["add_total_row"] = report.add_total_row and not result.get(
		"skip_total_row", False
	)

	return result

def check_report_perm(report):
	try:
		if report.name !="Medical Coder FLow":
			if not frappe.has_permission(report.ref_doctype, "report"):
				frappe.msgprint(
					_("Must have report permission to access this report."),
					raise_exception=True,
				)
	except Exception as e:
		print(e)
