frappe.listview_settings["Hold Reason"] = {
    onload:function(listview){
        hiding_side_bar(listview)
    },
    refresh:function(listview){
        listview_hiding()
    }
    
}

function hiding_side_bar(listview){
    // Hiding the sidebar

    if (frappe.session.user === "Administrator"){
		cur_list.page.sidebar.show();
		// 3 dot menu 
		$('.menu-btn-group').show()
	}
    else if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        cur_list.page.sidebar.remove();
        // 3 dot menu 
        listview.page.menu_btn_group.hide()
        // $('.menu-btn-group').hide()
    }
}

function listview_hiding(){
    if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        $(`[data-view="Dashboard"],[data-view="Kanban"]`).remove();
    }

    if (["Medical Coder","QA"].includes(frappe.boot.wms.role_profile)){
        $(`[data-view="Report"]`).remove();
    }
     
}