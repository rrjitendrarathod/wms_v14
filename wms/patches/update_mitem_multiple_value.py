import os
import frappe

# updating the multiple value doctype name to 300
def execute():
    frappe.db.sql("""ALTER TABLE `tabMItems Multiple Values` MODIFY COLUMN name VARCHAR(300)""")
    frappe.db.sql("""ALTER TABLE `tabMItems Multiple Values Table` MODIFY COLUMN multiple_values VARCHAR(400)""")
