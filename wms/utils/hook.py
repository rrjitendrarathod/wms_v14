import frappe

def clone_table(doc,method):
    """clone icd_code table in icd_codeqa"""
    user= None
    try:
        user = frappe.get_doc("User",frappe.session.user)
    except frappe.DoesNotExistError as e:
        frappe.log_error(e,'user not exist')
    
    if doc.icd_code and user.role_profile_name=="QA":
        for row in doc.icd_code:
            child = doc.append('icd_codeqa',{})
            child.icd_qa = row.icd
    doc.save(ignore_permissions=True)
