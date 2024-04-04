import frappe
from frappe.model.workflow import (
        print_workflow_log,
        show_progress,
        apply_workflow,
)
from frappe import _
import json
from wms.public.py.notification  import has_role_profile

@frappe.whitelist()
def bulk_workflow_approval(docnames, doctype, action):
    from collections import defaultdict

    # dictionaries for logging
    failed_transactions = defaultdict(list)
    successful_transactions = defaultdict(list)

    # WARN: message log is cleared
    print("Clearing frappe.message_log...")
    frappe.clear_messages()

    docnames = json.loads(docnames)
    for (idx, docname) in enumerate(docnames, 1):
        
        medical_doc = frappe.get_doc(doctype, docname)
        
        # ONLY need hold reason because all action remove in list view except char lock related 
        if medical_doc.get("hold_reason") or medical_doc.get("technical_issue"):
            frappe.msgprint(msg=f"{medical_doc.name} Chart action cannot be taken,Please Remove the data in the <b>Hold Reason</b> or <b>Technical_issue</b>",title='Warning',indicator = 'red')
            continue            
              
        else:
            message_dict = {}
            try:
                show_progress(docnames, _("Applying: {0}").format(action), idx, docname)
                apply_workflow(frappe.get_doc(doctype, docname), action)
                frappe.db.commit()
            except Exception as e:
                if not frappe.message_log:
                    # Exception is  raised manually and not from msgprint or throw
                    message = "{0}".format(e.__class__.__name__)
                    if e.args:
                        message += " : {0}".format(e.args[0])
                    message_dict = {"docname": docname, "message": message}
                    failed_transactions[docname].append(message_dict)

                frappe.db.rollback()
                frappe.log_error(
                    frappe.get_traceback(),
                    "Workflow {0} threw an error for {1} {2}".format(action, doctype, docname),
                )
            finally:
                if not message_dict:
                    if frappe.message_log:
                        messages = frappe.get_message_log()
                        for message in messages:
                            frappe.message_log.pop()
                            message_dict = {"docname": docname, "message": message.get("message")}

                            if message.get("raise_exception", False):
                                failed_transactions[docname].append(message_dict)
                            else:
                                successful_transactions[docname].append(message_dict)
                    else:
                        successful_transactions[docname].append({"docname": docname, "message": None})

            if failed_transactions and successful_transactions:
                indicator = "orange"
            elif failed_transactions:
                indicator = "red"
            else:
                indicator = "green"

            print_workflow_log(failed_transactions, _("Failed Transactions"), doctype, indicator)
            print_workflow_log(successful_transactions, _("Successful Transactions"), doctype, indicator)
