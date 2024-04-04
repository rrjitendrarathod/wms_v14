// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["QA"] = {
	"filters": [
		{
			"fieldname":"mr_number",
			"label": __("MR Number"),
			"fieldtype": "Data",
			"options": "MR Number"
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
		
		{
			"fieldname":"status",
			"label": __("Status"),
			"fieldtype": "Select",
			"options":['', 'Open','Closed','Cancelled'],
			"width":100,
			"reqd":0,
			
		},
		
				
	],
	onload:function(){

		hide_field()
		
	}
};

function hide_field(){
	
	if(frappe.user_roles.includes('QA Lead')){
			frappe.query_report.get_filter("mr_number").toggle(false)
	}


}
