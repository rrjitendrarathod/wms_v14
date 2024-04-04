import frappe
from frappe import _, msgprint
from frappe.share import add


#-----------share-doc and system notification------------------------#
def make_system_notification(users, message, doctype, docname,subject=None):
    try:
        if subject:
            for user in users:
                notification = frappe.get_doc(dict(doctype="Notification Log", document_type=doctype, document_name=docname, subject=message, for_user=user, from_user=frappe.session.user,type="Alert"))
                notification.save(ignore_permissions=True)
    except Exception as e:
        frappe.log_error(e, "System Notification")



def share_doc(doctype, docname, user):
    try:
        add(doctype, docname, user=user, read=1, write=1, submit=1, notify=0, flags={"ignore_share_permission": 1})
    except Exception as e:
        frappe.log_error(e, "Share")

@frappe.whitelist()
def has_role_profile(array):
    """
    pass the roles list/str

    eg: ["Medical Coder","Administrator"]
    eg: "Medical Coder"

    return True/False
    """
    if isinstance(array,list):
        return any(role in array for role in frappe.get_roles())
    elif isinstance(array,str):
        return array in frappe.get_roles()

    else:
        return False
