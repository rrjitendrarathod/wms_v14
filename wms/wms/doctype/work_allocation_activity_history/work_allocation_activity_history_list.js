// Copyright (c) 2023, Manju and contributors
// For license information, please see license.txt

frappe.listview_settings['Work Allocation Activity History'] = {

    hide_name_column: !["Administrator","QA Lead"].includes(frappe.boot.wms.role_profile) ? true : false,

    
    onload:function(listview){
        // show_hide_mrnumber(listview)
        remove_assignTOQa(listview)

        hiding_side_bar(listview)   
        

    },

    refresh:function(listview){
        listview_hiding(listview)

        hide_mr_number(listview)

        if (!["Administrator"].includes(frappe.boot.wms.role_profile)){
            remove3DotMenu(listview,["Toggle Sidebar"])
        }

    },

    formatters: {
		arrived_date(val, d, f) {
			if(val){
				return moment(val).format("MM-DD-YYYY");
			}
		}
	},

  
}



function show_hide_mrnumber(listview){
    if (!["Administrator","QA Lead"].includes(frappe.boot.wms.role_profile)){
        $('[data-original-title="Name"]').remove()
    }
}

function remove_assignTOQa(listview){
    if (!["Administrator"].includes(frappe.boot.wms.role_profile)){
        remove_assign_to(listview,"Assign To")
  }

}


function remove_assign_to(listview,action){

    var actionButtons = listview.page.actions
  
    actionButtons.children().each(function() {
      var actionButton = $(this);
      var buttonText = actionButton.text().trim();
  
      if (buttonText === action) {
          // Remove the action button
          actionButton.remove();
      }
  })
  
  }
  

function hiding_side_bar(listview){
    // Hiding the sidebar
   if (!["Administrator","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){ 
        cur_list.page.sidebar.remove();

        // 3 dot menu 
        // $('.menu-btn-group').hide()
    }
}

function listview_hiding(listview){
    if (!["Administrator","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){ 
        $(`[data-view="Dashboard"]`).remove();
        $(`[data-view="Kanban"]`).remove();
    }
}

function hide_mr_number(listview){
    if(["QA Lead"].includes(frappe.boot.wms.role_profile)){
        listview.data.map((item)=>{
            if(item.work_flow_state == "Pending Quality" || item.work_flow_state == "Picked for Audit"){
                $(`.ellipsis[title="MR Number: ${item.mr_number}"]`).hide()
            }else{
                if(item.work_flow_state == "Pending Quality" || item.work_flow_state == "Picked for Audit"){
                    $(`.ellipsis[title="MR Number: ${item.mr_number}"]`).show()
                }
            }
            //Commenting this code as the title of the document is changed to name from mr_number.
            // else if(item.work_flow_state != "Pending Quality" || item.work_flow_state != "Picked for Audit"){
            //     $(`.ellipsis[title=${item.name}]`).remove();
            // }
        })

    }
}

const remove3DotMenu = (listview,options)=>{
    var three_dot_menu = listview.page.menu
    three_dot_menu.children().each(function() {
        var rename_button = $(this);
        var buttonText = rename_button.text().trim();
        var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];
        
        if (options.includes(button)) {
            rename_button.remove();
        }
    })
}
