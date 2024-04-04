frappe.listview_settings['QA Weightage'] = {
	onload: function(listview){

        set_filter(listview)
		remove_action(listview)
        // remove filter except admin
        remove_filter_section()

	}
	
};

function set_filter(listview){
    var url = window.location.href.split("?")[0].split("/");
    var targetString = url[url.length - 1];
    frappe.route_options = {
        "medical_coder_flow": targetString
    }

}

function remove_action(listview){
	if (!["Administrator"].includes(frappe.boot.wms.role_profile)){
		remove_action_option(listview,["Assign To","Edit"])
    }

}

function remove_filter_section(){
    if (["QA"].includes(frappe.boot.wms.role_profile)){
        $('.filter-selector').hide()
    }
}


function remove_action_option(listview,action){
    var actionButtons = listview.page.actions
    actionButtons.children().each(function() {
      var actionButton = $(this);
      var buttonText = actionButton.text().trim();
  
      if (action.includes(buttonText)) {
          // Remove the action button
          actionButton.remove();
        }
    })
  
}
