import os
import frappe

#disable energy points in email notifications
def execute():
    frappe.db.sql("""UPDATE `tabNotification Settings` SET enable_email_energy_point = 0 WHERE name != 'Administrator'""")