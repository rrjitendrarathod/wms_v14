// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('Work Allocation Activity History', {
	refresh: function(frm) {
		remove_sidebar(frm)
		// only read form
		frm.disable_form();
		// set work_allocation read only
		// frm.set_df_property("work_allocation", "read_only", frm.is_new() ? 0 : 1);
		three_dot_menu(frm)
		if (!["Administrator","WMS Super User"].includes(frappe.boot.wms.role_profile)){
			hide_mr_number(frm)
		}
		hide_search_row()
		// medical_coder_flow(frm)
	},
});

function remove_sidebar(frm){
  if (!["Administrator","WMS Super User"].includes(frappe.boot.wms.role_profile)){ 
    cur_frm.page.sidebar.remove();
  }
}



function three_dot_menu(frm){  
	if (!["Administrator","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){ 
		remove_assign_to(frm,["Copy to Clipboard","Links"]);		
	}
	
}



function remove_assign_to(frm,option){

	var three_dot_menu = frm.page.menu

	three_dot_menu.children().each(function() {
		var rename_button = $(this);
		var buttonText = rename_button.text().trim(); 

		if (option.includes(buttonText)) {
			rename_button.remove();
		}
	})

}

function hide_mr_number(frm){	
	var ws = ["Picked for Audit","Pending Quality"]
	if(frappe.user_roles.includes('QA Lead') && (ws.includes(frm.doc.work_flow_state))){
	 frm.toggle_display(['mr_number'], 0);
	//  $(`.ellipsis.title-text`).hide()	 
	}
	// else if(frappe.user_roles.includes('QA Lead') && (!ws.includes(frm.doc.work_flow_state) )){
	// 	frm.toggle_display(['mr_number'], 1);
	// }
	
	// disable email button
	$(`.btn-secondary-dark`).prop('disabled', true)
}

// function medical_coder_flow(frm){
// 	if (frm.doc.work_allocation && (frappe.user_roles.includes('Production TL') || frappe.user_roles.includes('QA Lead') || frappe.user_roles.includes("Operations Manager") || frappe.user_roles.includes("QA Manager")|| frappe.user_roles.includes("Department Head") ||  frappe.user_roles.includes("Administrator") || frappe.user_roles.includes("WMS Manager") || frappe.user_roles.includes("Super User"))){
// 	  frm.add_custom_button(__('Medical Coder Flow'), () => {
// 		frappe.set_route('Form', "Medical Coder Flow", frm.doc.work_allocation);
		
// 	  }).removeClass("btn-default").addClass("btn-primary")
// 	}
// }

function hide_search_row() {
	$('.row-check.search').hide()
	$('.grid-static-col.search, .row-index.search').hide()
}