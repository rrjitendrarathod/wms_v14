frappe.listview_settings['Data Import'] = {
	onload:function(listview){
		hide_sidebar(listview)
	},
	refresh:function(listview){
		hide_listview(listview)
	},
	
	get_indicator: function(doc) {
		var colors = {
			'Pending': 'orange',
			'Not Started': 'orange',
			'Partial Success': 'orange',
			'Success': 'green',
			'In Progress': 'orange',
			'Error': 'red',
			'Failed':'red',
            
		};
		let status = doc.status;
		if (imports_in_progress.includes(doc.name)) {
			status = 'In Progress';
		}
		if (status == 'Pending') {
			status = 'Not Started';
		}
        if (status == 'Error') {
			status = 'Error';
		}
		if (status == 'Failed') {
			status = 'Failed';
		}
		return [__(status), colors[status], 'status,=,' + doc.status];
	},

};

function hide_sidebar(listview){
	if (["WMS Super User","Super Admin","Production Inventory Allocation","Department Head","Super User"].includes(frappe.boot.wms.role_profile)){
		
		cur_list.page.sidebar.remove();
        // 3 dot menu 
        $('.menu-btn-group').hide()

		remove_assign_to(listview,"Toggle Sidebar")
		remove_assign_to(listview,"Share URL")

	}
}

function hide_listview(listview){

	if (["Super User","WMS Super User","Super Admin","Production Inventory Allocation","Department Head"].includes(frappe.boot.wms.role_profile)){
		$(`[data-view="Dashboard"]`).remove();
		$(`[data-view="Kanban"]`).remove();
	}
}


function remove_assign_to(listview){

	if(frappe.session.user != "Administrator")
	{

	var three_dot_menu = listview.page.menu
	
	three_dot_menu.children().each(function() {
		
		var rename_button = $(this);		
	
		var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];
		if (button === "Toggle Sidebar" || button === "Share URL") {
			rename_button.remove();
		}
	
	
	})
}
	
}