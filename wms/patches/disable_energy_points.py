import os
import frappe

#disable energy points in system notifications
def execute():
    frappe.db.sql("""UPDATE `tabNotification Settings` SET energy_points_system_notifications = 0 WHERE name != 'Administrator'""")
