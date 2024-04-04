// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

function get_chartstatus_options(){
	let options = '';
	options += "In-Progress" + "\n" + "Chart Locked" + "\n" + "Pending Assignment to Coder" + "\n" + "Not Started" + "\n"
	frappe.call({
		"method": "wms.wms.report.medical_coder_flow.medical_coder_flow.get_chartstatus_options",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options
}

function get_medical_coders(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.work_allocation_report.work_allocation_report.get_medical_coders",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options


}

function get_assigned_qa(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.work_allocation_report.work_allocation_report.get_assigned_qa",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options

}

function get_assigned_qatl(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.work_allocation_report.work_allocation_report.get_assigned_qatl",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options

}

function get_production_tl_list(){
	let options = '';
	frappe.call({
		"method": "wms.wms.report.work_allocation_report.work_allocation_report.get_production_tl_list",
		"async": 0,
		"callback": function(r){
			options += r.message;
		}
	});
	return options

}
// TODO:change assesment_type update to LINK
// TODO:payor_type update to Link
frappe.query_reports["Work Allocation Report"] = {
	"filters": [
		{
			"fieldname":"name",
			"label": __("MR Number"),
			"fieldtype": "Link",
			"options": "Bulk Upload Activities",
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
						'SCIC'
					],
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
			"width":100,
			"options":get_production_tl_list(),
			"width":100,
		},
		{
			"fieldname":"assigned_coder",
			"label": __("Assigned Coder"),
			"fieldtype": "MultiSelect",
			"options":get_medical_coders(),
			"width":100,
			
		},
		{
			"fieldname":"assigned_qatl",
			"label": __("Assigned QATL"),
			"fieldtype": "MultiSelect",
			"options":get_assigned_qatl(),
			"width":100,
		},
		{
			"fieldname":"assigned_qa",
			"label": __("Assigned QA"),
			"fieldtype": "MultiSelect",
			"options":get_assigned_qa(),
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
			"fieldname":"from_date",
			"label": __("Chart Upload From Date"),
			"fieldtype": "Date",
			"width":100,
	
		},
		{
			"fieldname":"to_date",
			"label": __("Chart Upload To Date"),
			"fieldtype": "Date",
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
			"label": __("Technical Isuue"),
			"fieldtype": "Link",
			"width":100,
			"options":'Technical Issue',
		},


	],
	onload:function(frm){
		chart_status_hover();

		three_dot_menu(frm);

		set_card_hide();

		hide_search_field()

		frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
	},

	"formatter": function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);
        if (column.fieldname == "status" && data && data.status === 'Inactive') {
                value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "status" && data && data.status === 'Active'){
                value = "<span style='color:green'>" + value.bold() + "</span>";
        }

        if (column.fieldname == "age_of_chart" && data && data.age_of_chart <= "1 days, 0 hours") {
            value = "<span style='color:orange'>" + value.bold() + "</span>";
        }
        else if(column.fieldname == "age_of_chart" && data && data.age_of_chart > "1 days, 0 hours"){
            value = "<span style='color:red'>" + value.bold() + "</span>";
        }
        return value;
    },

};


function hide_search_field(){
	if (["Production TL"].includes(frappe.boot.wms.role_profile)){
		frappe.query_report.get_filter("assigned_production_tl").toggle(false)
	}
	else if (["Medical Coder"].includes(frappe.boot.wms.role_profile)){
		frappe.query_report.get_filter("assigned_coder").toggle(false)

	}
}

function view_work_allocation_history(name){
	frappe.set_route("Form", "Work Allocation Activity History", name)
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



function three_dot_menu(frm){  
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

function set_card_hide(){
	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
	$('.custom-actions.hidden-xs.hidden-md').hide()
	}
}


