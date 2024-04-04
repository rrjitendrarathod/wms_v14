frappe.listview_settings['ToDo'] = {
	hide_name_column: true,
	add_fields: ["reference_type", "reference_name"],

	onload:function(listview){
		// admin skip 
		if(!["Administrator"].includes(frappe.session.user)){
			hiding_side_bar(listview)
			set_default_filter(listview)

			setTimeout(()=>{
				remove_read_only_option()
			},100)

			remove_todo_cancel_option(listview)
		}
		
	},
	button: {
		show: function(doc) {
			if (["Administrator"].includes(frappe.session.user)){
				return doc.reference_name;
			}
			else if (doc.status == "Open"){
				return doc.reference_name;
			}	
		},
		get_label: function() {
			return __('Open');
		},
		get_description: function(doc) {
			//return __('Open {0}', [`${doc.reference_type} ${doc.reference_name}`])
			return __('Open {0}', ['Medical Coder Flow'])
		},
		action: function(doc) {
			console.log(doc)
			if (['Work Allocation','Bulk Upload Activities'].includes(doc.reference_type)){
				frappe.db.exists('Medical Coder Flow',doc.reference_name).then(
					exists =>{
						exists ?
						frappe.set_route("Form", "Medical Coder Flow", doc.reference_name)
						:
						frappe.new_doc('Medical Coder Flow',{patient_reference_details:doc.reference_name})
	
					}
				)
			}
			else frappe.set_route("Form", 'ToDo', doc.name)
            //location.href = frappe.utils.get_form_link(doc.reference_type,doc.reference_name)
		}
	},

	refresh: function(me) {
		// Removing the option from listview 
		// if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
		// 	$('[data-view="Kanban"],[data-view="Gantt"],[data-view="Dashboard"],[data-view="Calendar"]').remove();
		// }
		// if (me.todo_sidebar_setup) return;

		// add assigned by me
		// me.page.add_sidebar_item(__("Assigned By Me"), function() {
		// 	me.filter_area.add([[me.doctype, "assigned_by", '=', frappe.session.user]]);
		// }, ('.list-link[data-view="Kanban"]'));

		// me.todo_sidebar_setup = true;
		
		// read only field (list data fix)
		// if (frappe.boot.wms.role_profile != "Administrator" && !frappe.user_roles.includes("WMS Manager")){
		// 	$('[data-fieldname="allocated_to"]').attr('readonly','readonly')
		// }

		// if (["Medical Coder","QA Lead"].includes(frappe.boot.wms.role_profile)){ 
        //     cur_list.page.sidebar.remove();
        // }
	},
	formatters: {
		arrived_date(val, d, f) {
			if(val){
				return moment(val).format("MM-DD-YYYY");
			}
		}
	},	
}

// currently no use 

// frappe.views.BaseList.prototype.prepare_data = function(r) {
//     this.page_length = 500;
//     let data = r.message || {};
    
//     data = !Array.isArray(data) ?
//         frappe.utils.dict(data.keys, data.values) :
//         data;
//     if (this.start === 0) {
//         this.data = data;
//     } else {
//         this.data = this.data.concat(data);
//     }
//     if(frappe.boot.wms.role_profile!="Administrator"){
//         this.data = this.data.filter(d=>frappe.session.user === d.owner)
//     }
  
// }

function hiding_side_bar(listview){	
	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile) && frappe.session.user != "Administrator"){

   		cur_list.page.sidebar.remove();   
		 
		// 3 dot menu 
		listview.page.menu_btn_group.hide()
	
    }

}

function set_default_filter(listview){
	if (!["WMS Manager","Administrator"].includes(frappe.boot.wms.role_profile)) {
		frappe.route_options = {
			"allocated_to": frappe.session.user,
			"status": "Open"
		};
	}
	listview.page.set_title(__("To Do"));
}

function remove_read_only_option(){
	if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation","Administrator"].includes(frappe.boot.wms.role_profile)){
			$(`[data-view="Kanban"],[data-view="Gantt"],[data-view="Dashboard"],[data-view="Calendar"]`).remove();
			
		}
		if (!["HR Manager","Production Inventory Allocation","QA Inventory Allocation","Administrator","Department Head","WMS Super User"].includes(frappe.boot.wms.role_profile)){
			$(`[title="Clear all filters"]`).eq(0).prop('disabled', true) 

		}


	// if (listview.todo_sidebar_setup) return;

	// add assigned by me
	// listview.page.add_sidebar_item(__("Assigned By Me"), function() {
	// 	me.filter_area.add([[me.doctype, "assigned_by", '=', frappe.session.user]]);
	// }, ('.list-link[data-view="Kanban"]'));

	// listview.todo_sidebar_setup = true;
	
	// read only field (list data fix)
	if (frappe.boot.wms.role_profile != "Administrator" || !frappe.user_roles.includes("WMS Manager")){
			$('[data-fieldname="allocated_to"]').attr('readonly','readonly')
		}

	if (["Medical Coder","QA Lead"].includes(frappe.boot.wms.role_profile)){ 
			cur_list.page.sidebar.remove();
		}

}

function remove_todo_cancel_option(listview){
	$(`[data-fieldname="status"]`).children().each(function() {
		var actionButton = $(this);
		var buttonText = actionButton.text().trim();
		if (buttonText == 'Cancelled'){
			actionButton.remove()
		}
	})

}



