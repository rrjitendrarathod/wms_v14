// Copyright (c) 2022, Manju and contributors
// For license information, please see license.txt

frappe.ui.form.on('Hold Reason', {
	refresh: function(frm) {

		if (!["Administrator","HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
			three_dot_menu(frm)
		}
	}
});

function three_dot_menu(frm){ 
	remove_assign_to(frm,"Links");		
	remove_assign_to(frm,"Copy to Clipboard");
}



function remove_assign_to(frm){

var three_dot_menu = frm.page.menu

three_dot_menu.children().each(function() {
	var rename_button = $(this);
	var buttonText = rename_button.text().trim();   
	

	var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];

	if ( buttonText === "Copy to Clipboard" || buttonText === "Links") {
		rename_button.remove();
	}


})

}
