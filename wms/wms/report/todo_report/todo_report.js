// Copyright (c) 2023, Frappe Technologies and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["ToDo Report"] = {

	
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

		hiding_side_bar()
		
	}
};

function hide_field(){
	
	if(frappe.user_roles.includes('QA Lead')){
			frappe.query_report.get_filter("mr_number").toggle(false)
	}


}

function hiding_side_bar(){	
	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){

   		cur_list.page.sidebar.remove();   
		 
		// 3 dot menu 
		// $('.menu-btn-group').hide();
	
    }

}
