// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

function get_chartstatus_options(){
	let options = '';
	options += "In-Progress" + "\n" + "Chart Locked" + "\n"
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_chartstatus_options",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options
}

function get_assiged_qa(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_assiged_qa",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options


}

function get_medical_coder(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_medical_coder",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options
}

function get_production_tl(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_production_tl",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options
}

function get_qa_tl(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_qa_tl",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options
}

	
frappe.query_reports["Medical Coder FLow"] = {
	"filters": [
		{
			"fieldname":"mr_number",
			"label": __("MR Number"),
			"fieldtype": "Link",
			"options":"Medical Coder Flow",
			"width":100,
		},
		{
			"fieldname":"assessment_type",
			"label": __("Assessment Type"),
			"fieldtype": "Select",
			"width":100,
			"options":[  "",
						'SOC',
						'ROC',
						'Recert',
						'SCIC'],
		},
		{
			"fieldname":"payor_type",
			"label": __("Payor Type"),
			"fieldtype": "Select",
			"width":100,
			"options":["",
					'Medicare',
					'Managed - Medicaid',
					'Managed - Medicare',
					'Medicaid',
					'Commercial'
				],
		},
		{
			"fieldname":"payor_type_hchb",
			"label": __("Payor Type (as per HCHB)"),
			"fieldtype": "Select",
			"width":100,
			"options":[  "",
						'Medicare',
						'PPS - Non Medicare',
						'Managed - Medicaid','Managed - Medicare',
						'Managed - Medicare - APM',
						'Medicaid','Commercial Insurance',
						'Contracts',
						'Insurance - MVA',
						'Insurance - WCO',
						'Other',
						'Self Pay - Home Health'
					],
			
		},
		{
			"fieldname":"arrived_date",
			"label": __("Arrived Date"),
			"fieldtype": "Date",
			"width":100,
			"options":frappe.boot.sysdefaults.date_format = "mm-dd-yyyy"
	
		},
		{
			"fieldname":"assigned_production_tl",
			"label": __("Assigned Production TL"),
			"fieldtype": "MultiSelect",
			"options":get_production_tl(),
			"width":100,
		},
		{
			"fieldname":"assigned_coder",
			"label": __("Assigned Coder"),
			"fieldtype": "MultiSelect",
			"options":get_medical_coder(),
			"width":100,
		},
		{
			"fieldname":"assigned_qatl",
			"label": __("Assigned QATL"),
			"fieldtype": "MultiSelect",
			"options":get_qa_tl(),
			"width":100,
	
		},
		{
			"fieldname":"assigned_qa",
			"label": __("Assigned QA"),
			"fieldtype": "MultiSelect",
			"options":get_assiged_qa(),
			"width":100,
			
		},
		{
			"fieldname":"from_date",
			"label": __("Audit From Date"),
			"fieldtype": "Date",
			"width":100,
			
		},
		{
			"fieldname":"to_date",
			"label": __("Audit To Date"),
			"fieldtype": "Date",
			"width":100,
			
		},
		{
			"fieldname":"workflow_state",
			"label": __("Status"),
			"fieldtype": "MultiSelect",
			"options":get_chartstatus_options(),
			"width":100,
		},
		{
			"fieldname":"hold_reason",
			"label": __("Hold Reason"),
			"fieldtype": "Link",
			"width":100,
			"options":'Hold Reason',
	
		},

		{
			"fieldname":"technical_issue",
			"label": __("Technical Issue"),
			"fieldtype": "Link",
			"width":100,
			"options":'Technical Issue',
	
		},
	
	],

	onload:function(frm){

		rename_the_report_name()

		chart_status_hover()	
		
		three_dot_menu(frm);

		set_card_hide(frm);

		hide_search_field()

		get_assiged_qa()

		frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
		
	},
	
};


function hide_search_field(){
	if (["QA Lead"].includes(frappe.boot.wms.role_profile)){
		frappe.query_report.get_filter("assigned_qatl").toggle(false)
	}
	else if (["QA"].includes(frappe.boot.wms.role_profile)){
		frappe.query_report.get_filter("assigned_qa").toggle(false)

	}
}

function chart_status_hover(){
	frappe.query_report.get_filter("workflow_state").$input.change(()=>{
		var status = frappe.query_report.get_filter("workflow_state").$input.val()
		if (status){
			$(`[data-fieldname="workflow_state"]`).attr("data-original-title",`${status}`)
		}
		else{
			$(`[data-fieldname="workflow_state"]`).attr("data-original-title","Status")
		}
	  })
}

function rename_the_report_name(){
	
	$(`[title="Medical Coder FLow"]`).html("QA Work Allocation Report")
}



function view_work_allocation_history(name){
	frappe.set_route("Form", "Work Allocation Activity History", name)
}


function three_dot_menu(frm)
{  
	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation","Administrator"].includes(frappe.boot.wms.role_profile)){
		remove_assign_to(frm);		
	}
	
}



function remove_assign_to(frm){

	var three_dot_menu = frm.page.menu

	three_dot_menu.children().each(function() {
		var option_button = $(this);
		var buttonText = option_button.text().trim();

		if (buttonText !== "Export") {
			option_button.remove();
		}
	});

}

function set_card_hide(frm){

	if(!frappe.user_roles.includes("Administrator")){
		$('.custom-actions.hidden-xs.hidden-md').hide()
	}
}