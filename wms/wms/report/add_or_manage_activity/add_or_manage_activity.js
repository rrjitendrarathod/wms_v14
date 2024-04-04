// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Add or Manage Activity"] = {
	"filters": [
		{
			"fieldname":"mr_number",
			"label": __("MR_number"),
			"fieldtype": "Data",
			"options": "MR Number"
		},
		
		{
			"fieldname":"assigned_manager",
			"label": __("Assigned Manager"),
			"fieldtype": "Link",
			options:"User" 
			
			
		},
		{
			"fieldname":"from",
			"label": __("From Date"),
			"fieldtype": "Date",
			"width":100,
			"reqd":0,
			"default":dateutil.year_start()
		},
		{
			"fieldname":"to",
			"label": __("To Date"),
			"fieldtype": "Date",
			"width":100,
			"reqd":0,
			"default":dateutil.year_end()
		},
				
	]
};
