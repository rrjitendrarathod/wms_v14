// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Hierarchy Report"] = {
	setup:(frm)=>{
		frappe.boot.sysdefaults.date_format = "mm-dd-yyyy";
	},
	filters: [

	],
	onload:function(frm){

		if (!["Administrator"].includes(frappe.boot.wms.role_profile)){
			remove_assign_to(frm,["Add Column"]);
		}
		if (!["Administrator","Production Inventory Allocation","QA Inventory Allocation","Medical Coder","HR Manager"].includes(frappe.boot.wms.role_profile)){
			three_dot_menu(frm);
			set_card_hide(frm);
		}
	},
};

function three_dot_menu(frm){  
	
	remove_assign_to(frm,["Edit","Print","PDF","Setup Auto Email"]);
	// remove_assign_to(frm,"Print");
	// remove_assign_to(frm,"PDF");
	// remove_assign_to(frm,"Setup Auto Email");		
	
}



function remove_assign_to(frm,action){

	var three_dot_menu = frm.page.menu

	three_dot_menu.children().each(function() {
		var rename_button = $(this);
		var buttonText = rename_button.text().trim(); 

		if (action.includes(buttonText)) {
			rename_button.remove();
		}


	})
}

function set_card_hide(frm){
	$('.custom-actions.hidden-xs.hidden-md').hide()
}