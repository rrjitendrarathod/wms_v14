"""A Python file which consist of functions that redirects the users to the respective
 home page and validate the route path in the role doctype"""

import frappe


# Routing function to redirect to the default homepage.
# def redirect_to_homepage():
#     from frappe.website.utils import get_home_page
#     from frappe.utils import validate_url
    
#     home_page = get_home_page().lower()
#     if home_page not in ['home']:
#         frappe.local.response["home_page"] = "/app/" + home_page
#     else:
#         frappe.local.response["home_page"] = "/app/rhrms"

    

# Function to validate the home page route in the role doctype.
def validate_homepage_route(doc,method=None):
    modules = frappe.get_all("Module Def", filters={"app_name": ("!=", "frappe")}, fields=["module_name"])

    module_list = []
   
    for module in modules:
        module_list.append(module['module_name'].lower())
    
    module_list.append('wfms')

    if doc.home_page:
        home_page = doc.home_page[1:].lower()
        if home_page not in module_list:
            frappe.throw('Home page <b>{}</b> is not recognizable. Kindly provide the valid home page route.'.format(doc.home_page[1:]))
        elif home_page in ['wms', 'WMS']:
            frappe.throw('Home page <b>{}</b> is not recognizable. Kindly provide the valid home page route.'.format(doc.home_page[1:]))
        else:
            pass