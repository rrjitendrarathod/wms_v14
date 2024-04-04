frappe.listview_settings["Bulk Upload Activities"] = {

	// add_fields: ["age_of_chart"],
	// get_indicator: function(doc)
	// {
	// 	if(doc.age_of_chart <= "1 days, 0 hours") {
	// 		return [__("1 days, 0 hours"), "red", "age_of_chart,=,1 days, 0 hours"];
	// 	}
	// 	else if(doc.age_of_chart > "1 days, 0 hours") {
	// 		return [__("1 days, 0 hours"), "green", "age_of_chart,=,1 days, 0 hours"];
	// 	}
	// },
	
	hide_name_column: !["Administrator"].includes(frappe.boot.wms.role_profile) ? true : false,

	onload: function (listview) {
      
		remove_assignTOQa(listview)

		if(["Production TL","Administrator","Production Inventory Allocation"].includes(frappe.boot.wms.role_profile) || frappe.user.has_role(["Super Admin", "WMS Manager"])){
			bulk_update_production_tl(listview)
		}
		if (frappe.session.user != "Administrator") {
			listview.page.actions.find('[data-label="Edit"]').parent().remove() //Removing the Edit Option from the Actions Button expect the Administrator
		}
		if(frappe.boot.wms.role_profile==="Medical Coder")
			add_assignment_btn(listview)

		if (frappe.user.has_role(["Production TL", "Administrator", "Super Admin", "WMS Manager"])) {
			bulk_update_medical_coder(listview)
		}
	},
	refresh:function(listview){
		hide_listview(listview)
		hide_mr_number_qatl(listview)
	},

	button: {
		show: function (doc) {
			if (["Medical Coder","Administrator"].includes(frappe.boot.wms.role_profile) && (doc.status == "Active") && (["Open", "Picked"].includes(doc.activity_status ))) {
				return doc.name;
			}
		},
		get_label: function () {
			return __('Create WA');
		},
		get_description: function (doc) {
			//return __('Open {0}', [`${doc.reference_type} ${doc.reference_name}`])
			return __('Open {0}', ['Medical Coder Flow'])
		},
		action: function (doc) {
			//console.log(doc)
			frappe.db.exists('Medical Coder Flow', doc.name).then(
				exists => {
					exists ?
						frappe.set_route("Form", "Medical Coder Flow", doc.name)
						:
						frappe.new_doc('Medical Coder Flow', { patient_reference_details: doc.name })

				}
			)
		}
	},

	formatters: {
		arrived_date(val, d, f) {
			if(val){
				return moment(val).format("MM-DD-YYYY");
			}
		}
	},	
};


function bulk_update_medical_coder(listview){

	const fields = [
		{
			"label": "User",
			"fieldname": "assigned_to",
			"fieldtype": "Link",
			"options":'User',
			"reqd": 1,
			get_query: () => {
				return {
					query: 'wms.wms.doctype.bulk_upload_activities.bulk_upload_activities.get_mc_list',
					filters: {
						roles: "Medical Coder",
					}
				}
			}
		}
	];
	

	const action = () => {

		var docnames = listview.get_checked_items(true);		
		const filteredArray = filterObjectsByNames(listview.data, docnames);
		const activeItems = filteredArray.filter(item => item.status === 'Active');
		const inactiveItems = filteredArray.filter(item => item.status !== 'Active');
		

		inactiveItems.forEach(item => {
			frappe.msgprint({
                title: __('Warning'),
                indicator: 'orange',
                message: __(`Cannot reassign Inactive charts<b>${item.name}</b>`)
              })
		});
		
		const d = new frappe.ui.Dialog({
			title: __("Reassign to Medical Coder"),
			fields: fields,
			primary_action: function() {
				const data = d.get_values();
				frappe.call({
					method: 'wms.wms.doctype.bulk_upload_activities.bulk_upload_activities.bulk_update_medical_coder',
					args: {
						doctype: listview.doctype,
						docnames: activeItems.map(item => item.name),
						data: data,
					},
					freeze: true,
					freeze_message: __('Updating Medical Coder ........'),
				});
				d.hide();
				refresh_list(listview);
			},
			primary_action_label: __('Update') 
		});
		
		// Show the dialog
		d.show();
		
		function filterObjectsByNames(arrayOfObjects, namesToFilter) {
			return arrayOfObjects.filter(obj => namesToFilter.includes(obj.name));
		}
	}

	listview.page.add_actions_menu_item(__('Reassign to Medical Coder'), action, false);

}

function bulk_update_production_tl(listview){

	const fields = [
		{
			"label": "User",
			"fieldname": "assigned_manager",
			"fieldtype": "Link",
			"options":'User',
			"reqd": 1,
			get_query: () => {
				return {
					query: 'wms.utils.assign.get_user_tl_list',
					filters: {
						roles: "Production TL",
					}
				}
			}
		}
	];
	
	const action = () => {
        var docnames = listview.get_checked_items(true);
        const filteredArray = filterObjectsByNames(listview.data, docnames);
        
        const activeItems = filteredArray.filter(item => item.status === 'Active');
        const inactiveItems = filteredArray.filter(item => item.status !== 'Active');
        
        if (inactiveItems.length === 0) {
            showUpdateDialog(activeItems);
        } else {
            inactiveItems.forEach(item => {
                frappe.msgprint({
                    title: __('Warning'),
                    indicator: 'orange',
                    message: __(`Cannot reassign Inactive charts <b>${item.name}</b>`)
                })
            });
        }
        
        function showUpdateDialog(activeItems) {
            const d = new frappe.ui.Dialog({
                title: __("Reassign to Production TL"),
                fields: fields,
                primary_action: function() {
                    const data = d.get_values();
                    frappe.call({
                        method: 'wms.wms.doctype.bulk_upload_activities.bulk_upload_activities.bulk_update_production_tl',
                        args: {
                            doctype: listview.doctype,
                            docnames: activeItems.map(item => item.name),
                            data: data,
                        },
                        freeze: true,
                        freeze_message: __('Updating Production TL ........'),
                    });
                    d.hide();
                    refresh_list(listview);
                },
                primary_action_label: __('Update')
            });
            
            // Show the dialog
            d.show();
        }
        
        function filterObjectsByNames(arrayOfObjects, namesToFilter) {
            return arrayOfObjects.filter(obj => namesToFilter.includes(obj.name));
        }
    }

	listview.page.add_actions_menu_item(__('Assign/Reassign to Production TL'), action, false);

}


function remove_assignTOQa(listview){
	
	if (!frappe.user.has_role("Administrator")){
		cur_list.page.sidebar.remove();
	}

	if(["Production Inventory Allocation","Medical Coder","Department Head","Operations Manager","QA Inventory Allocation","QA Lead"].includes(frappe.boot.wms.role_profile)){
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

function hide_listview(listview){

	if (["WMS Super User","Super User","Production Inventory Allocation","Production TL","Medical Coder","Department Head","Operations Manager"].includes(frappe.boot.wms.role_profile)){

		$(`[data-view="Dashboard"]`).remove();
		$(`[data-view="Kanban"]`).remove();

		// 3 dot menu 
		listview.page.menu_btn_group.hide()
	}
}

function refresh_list(listview){
	setTimeout(()=>{
		if (cur_dialog){
			cur_dialog.hide()
		}
	listview.refresh()
	},3000)
}

function add_assignment_btn(listview){
    if($(".btn-self-assignment").length == 0){
        var route = frappe.get_route_str();
        var viewName = route.split('/')[2];
        if (viewName === 'List') { 
        $(`[data-page-route="List/Bulk Upload Activities/List"]`).find('.custom-actions')
        .prepend(listview.page.add_button('Self Assignment',()=>{
            items = listview.get_checked_items()
            frappe.call({
                method:"wms.utils.api.validate_queue",
                args:{items:items}
            })
        }).addClass('btn-self-assignment'))
    }

    }
}

frappe.realtime.on('sync_list',()=>{
	cur_list.refresh()
})

function hide_mr_number_qatl(listview){
	if (["QA Lead"].includes(frappe.boot.wms.role_profile)) {
		frappe.db.get_list('Medical Coder Flow', {
			fields: ['mr_number'],
			filters: {
				chart_status: ['in', ['Pending Quality', 'Picked for Audit']]
			},
			limit: 20000
		}).then(records => {
			records.forEach(record => {
				$(`.ellipsis[title="${record.mr_number}"]`).hide();
				})
	})
}
}