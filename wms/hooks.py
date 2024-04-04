from . import __version__ as app_version

app_name = "wms"
app_title = "Wms"
app_publisher = "Manju"
app_description = "Workflow Management System"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "manjunath.s@ciphercode.co"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/wms/css/wms.css"
app_include_js = ['wms_form.bundle.js',
                  'wms.bundle.js',
                  "/assets/wms/js/custom_states.js",
                  "/assets/wms/js/progress_bar.js",
                  "/assets/wms/js/multicheck.js"
				]

# app_include_js = [
# 			"/assets/wms.min.js",
#             "/assets/form.min.js",
#             "/assets/template.min.js",
#             ]
boot_session = "wms.public.py.user_data.update_boot"


# include js, css files in header of web template
# web_include_css = "/assets/wms/css/wms.css"
# web_include_js = "/assets/wms/js/wms.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "wms/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views



doctype_js = {
			"ToDo" : "public/js/todo.js",
            "User":"public/js/user.js",
            "Data Import":"public/js/data_import.js",
            "Role Profile": "public/js/role_profile.js",
            "Module Profile": "public/js/module_profile.js"
		}

doctype_list_js = {
		"Bulk Upload Activities" : "public/js/bulk_upload_activity_list.js",
		"Notification Log" : "public/js/notification.js",
		"ToDo":"public/js/todo_list.js",
		"Data Import":"public/js/override_list/data_import_list.js",
		"Role":"public/js/override_list/role_list.js"
	}





# doctype_list_js = {"Medical Coder Flow" : "public/js/medical_coder_flow_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# get_website_user_home_page = "wms.website.get_home_page"

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "wms.install.before_install"
# after_install = "wms.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "wms.uninstall.before_uninstall"
# after_uninstall = "wms.uninstall.after_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "wms.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways


# permission_query_conditions = {
# 	# "Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# 	# 
# }


permission_query_conditions = {
	# "Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
	"Employee":"wms.permissions.get_permission_query_for_employee",
    "Medical Coder Flow":"wms.permissions.permission_for_roles",
    "Bulk Upload Activities":"wms.permissions.permission_for_bulk_upload",
    "User":"wms.permissions.permission_for_user",
	"Role":"wms.permissions.role_only_enabled_user",
	# "Role Profile":"wms.permissions.roleprofile_only_enabled_user",
	"Work Allocation Activity History":"wms.permissions.user_in_work_allocation_history",
    "QA Weightage":"wms.permissions.permisssion_for_qa_weightage"
}
#

# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	# "ToDo": "custom_app.overrides.CustomToDo"
	# "ToDo":"ToDo.add",
	"Data Import":"wms.overrides.data_import.DataImportCustom",
}

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }



doc_events = {
	'Medical Coder Flow':{
		# 'before_save': ['wms.wms.doctype.medical_coder_flow.medical_coder_flow.create_qa_weightage_form'],
		'on_update': ['wms.wms.doctype.medical_coder_flow.medical_coder_flow.todo_close_button'],	
        # 'after_insert':['wms.utils.hook.clone_table']	
	},	
    'Work Allocation Activity History':{
		'on_update':['wms.wms.doctype.work_allocation_activity_history.work_allocation_activity_history.upload_chart_status'],
	},
	'Role':{
        'before_save':"wms.public.py.route.validate_homepage_route",
	},
    'Bulk Upload Activities':{
        'after_insert': "wms.utils.api.update_age_of_chart"
	}

}

jinja = {
	"methods": [
		"wms.public.py.notification.has_role_profile"
	]
}



# Scheduled Tasks
# ---------------

scheduler_events = {
	# "all": [
	# 	"wms.tasks.all"
	# ],
	# "daily": [
	# 	"wms.tasks.daily"
	# ],
	"hourly": [
		"wms.jobs.calculate_age",
        "wms.jobs.calculate_age_mc",
		"wms.jobs.tat_notification"
	],
	"daily": [
		"wms.jobs.clear_activity_count"
	],
	# "hourly": [
	# 	"wms.jobs.calculate_age"
	# ],
	# "weekly": [
	# 	"wms.tasks.weekly"
	# ]
	# "monthly": [
	# 	"wms.tasks.monthly"
	# ]
    # "cron": {
    #     "* * * * *": ["wms.jobs.calculate_age"],
	# }
}

# Testing
# -------

# before_tests = "wms.install.before_tests"

# Overriding Methods
# ------------------------------
#
override_whitelisted_methods = {
	"frappe.desk.form.assign_to.add_multiple": "wms.public.py.user_data.add_multiple",
	"frappe.desk.form.assign_to.add": "wms.public.py.user_data.add",
	"frappe.desk.search.search_link": "wms.public.py.user_data.search_link",
	"frappe.desk.query_report.get_script":"wms.public.py.report.get_script",
	"frappe.desk.query_report.run":"wms.public.py.report.run",
	"frappe.model.workflow.bulk_workflow_approval":"wms.public.py.workflow.bulk_workflow_approval",
	"frappe.desk.reportview.get":"wms.utils.reportview.get",
    "frappe.desk.reportview.get_count":"wms.utils.reportview.get_count",
	"frappe.desk.form.assign_to.remove":"wms.public.py.user_data.remove"
}

#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "wms.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

user_data_fields = [
	{
		"doctype": "{doctype_1}",
		"filter_by": "{filter_by}",
		"redact_fields": ["{field_1}", "{field_2}"],
		"partial": 1,
	},
	{
		"doctype": "{doctype_2}",
		"filter_by": "{filter_by}",
		"partial": 1,
	},
	{
		"doctype": "{doctype_3}",
		"strict": False,
	},
	{
		"doctype": "{doctype_4}"
	}
]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"wms.auth.validate"
# ]

# Translation
# --------------------------------

# Make link fields search translated document names for these DocTypes
# Recommended only for DocTypes which have limited documents with untranslated names
# For example: Role, Gender, etc.
# translated_search_doctypes = []
# fixtures = ['Workflow', 'Workflow State']
# fixtures = [
#         {"dt": "List View Settings", "filters": [
#         [
#             "name", "in", [
#                 "Medical Coder Flow"

#             ]
#         ]
#     ]}
# ]


# on_session_creation = [
#        "wms.public.py.route.redirect_to_homepage"
# ]