frappe.listview_settings["Medical Coder Flow"] = {
    hide_name_column: !["Administrator","QA Lead"].includes(frappe.boot.wms.role_profile) ? true : false,
    onload: function (listview) {
        swap_columns_workAllocation(listview)
        // remove side bar Medical code flow listview
        remove_sidebar(listview);
        remove_assignTOQa(listview)
        removeActions(listview)
        remove_workflow_action(listview)
        hide_mr_number_qalead_qa_allocation(listview)
        if(["QA Lead","Administrator"].includes(frappe.boot.wms.role_profile) || frappe.user.has_role(["Super Admin", "WMS Manager"])){
            bulk_update_qa_lead(listview)
    	}
        
        $('[data-label="Chart%20Lock"]').click(function(){
            refresh_listview(listview)
        });
        if(listview.doctype == "Medical Coder Flow" && frappe.boot.wms.role_profile==="QA")
			add_assignment_btn(listview)
        // toggle_filters(listview)
        var route = frappe.get_route_str();
        var viewName = route.split('/')[2];
        if (viewName === 'List') { 
            $(document).ready(function() {
                if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
                    cur_list.filter_area.filter_list.clear_filters();
                    cur_list.filter_area.filter_list.update_filter_button();
                    cur_list.filter_area.filter_list.on_change() 
                    listview.refresh()  
                }
                else {
                    listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
                    listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
                    listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
                    listview.list_sidebar.list_view.refresh() 
                }
            })
            button_filters(listview)
            show_hide_columns(listview)
        }
        if(frappe.user.has_role(["Super Admin", "WMS Manager", "Administrator", "QA Lead"])){
            qa_reassignment(listview)
	    }
        
    },

    refresh:function(listview){
        hide_listview(listview)
        // hide_mr_number_for_qalead(listview)
        hide_mr_number(listview) 
        $(".btn.btn-secondary.btn-xs.clear-filters").click(function(listview){
            $('.custom-button').removeClass('highlight');
            $("button.custom-button:contains('Home')").addClass("highlight");
            listview.refresh();
        });

    },
    
    formatters: {
        // custom chart status list view as status
        chart_status(val, row, column) {
            const indicator = frappe.get_indicator(column, "Medical Coder Flow");
            return `<div class="list-row-col ellipsis hidden-xs ">
                        <span class="indicator-pill ${indicator[1]} ellipsis" title="Status: ${column.workflow_state}">
                            <a class=" filterable ellipsis" data-filter="${row.fieldname},=,${column.workflow_state}">
                                ${column.workflow_state}
                            </a>
                        </span>
                    </div>`;
        },
    },

    formatters: {
		arrived_date(val, d, f) {
			if(val){
				return moment(val).format("MM-DD-YYYY");
			}
		}
	},
};

function remove_workflow_action(listview){
    $('.btn-primary').click(function(){
        _removed_workflow_actions(listview)
	})
}

function _removed_workflow_actions(listview){
	workflow_state = ['Error Corrected by QA', 'Error Corrected by Coder', 'Production Completed', 'No Error']
	let work_lst = []
	let ptl_actions=['Chart Lock']
	if(frappe.user.has_role("Chart Lock User")){
		listview.get_checked_items().forEach((v) => {
			if (!workflow_state.includes(v.workflow_state)){
				work_lst.push(v.workflow_state)
			}
		});
		remove_action_(listview, work_lst, ptl_actions)
	} else {
		remove_assign_to(listview, ptl_actions)
	}

	let qalead_workflow_state = []
	let qal_action = ['Assigned to QA']
	if(frappe.user.has_role("QA Lead")){
		listview.get_checked_items().forEach((v) => {
			if (!['Picked for Audit'].includes(v.workflow_state)){
				qalead_workflow_state.push(v.workflow_state)
			}
		});
		// remove_action_(listview, qalead_workflow_state, qal_action)
	} else {
		remove_assign_to(listview, qal_action)
	}

	let qainv_workflow_state = []
	let qain_action=["Assigned to QA Lead"]
	if(frappe.user.has_role("QA Inventory Allocation")){
		listview.get_checked_items().forEach((v) => {
			if (!['Production Completed'].includes(v.workflow_state)){
				qainv_workflow_state.push(v.workflow_state)
			}
		});	
		remove_action_(listview, qainv_workflow_state, qain_action)
	} else {
		remove_assign_to(listview, qain_action)
	}
}

function remove_action_(listview, work_lst, actions){
	if (work_lst.length>0){
		    remove_assign_to(listview, actions)
	} else {
		listview.set_actions_menu_items();
		remove_assignTOQa(listview)
		removeActions(listview)
	}

	if(!frappe.user.has_role("Chart Lock User")){
		remove_assign_to(listview, ['Chart Lock'])
	}

	if(["QA Lead","Administrator"].includes(frappe.boot.wms.role_profile) || frappe.user.has_role(["Super Admin", "WMS Manager"])){
        bulk_update_qa_lead(listview)
	}
    if(frappe.user.has_role(["Super Admin", "WMS Manager", "Administrator", "QA Lead"])){
        qa_reassignment(listview)
    }
}

function refresh_listview(listview) {
    listview.refresh_columns(meta, listview.list_view_settings)
    setTimeout(function() {
        location.reload();
    }, 3000);
}

function remove_sidebar(listview) {
  if (!["Administrator"].includes(frappe.boot.wms.role_profile)){
    listview.page.sidebar.remove();
    listview.page.menu_btn_group.hide() 
  }
  
}

// currently we have discard this because of unusual behavior
function swap_columns_workAllocation(listview){
    if (listview.columns && ["QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        listview.columns[0].df.label = "Name";
        listview.render_header(listview.columns);
    }
}

function hide_mr_number_qalead_qa_allocation(listview){
    if (["QA Lead","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        $(`[data-fieldname="mr_number"]`).remove()
    }

    if(!["QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        $('[data-original-title="Assigned QATL"]').remove()
    }
}


function remove_assignTOQa(listview){
    // listview.page.actions[0].childNodes[58].remove()
    if (!["Production Inventory Allocation","HR Manager"].includes(frappe.boot.wms.role_profile)){
        cur_list.page.sidebar.remove();    
        remove_assign_to_three_dot(listview,"Toggle Sidebar")
        remove_assign_to_three_dot(listview,"Share URL")
	}

    if (["QA Lead","Administrator"].includes(frappe.boot.wms.role_profile)){
        remove_assign_to(listview,['Assigned to QA'])
    } else if (["QA Inventory Allocation","Administrator"].includes(frappe.boot.wms.role_profile)){
        remove_assign_to(listview,['Assigned to QA Lead'])
    }

    // remove assign to in actions
    if (!["QA Lead","Administrator","QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        remove_assign_to(listview,["Assign To"])
    }
}

const removeActions = (listview) =>{
    let action_name =["Print",
                    "Add Tags",
                    "Apply Assignment Rule",
                    "Assign To",
                    "Chart Lock",
                    "Delete",
                ]
    
    var actionButtons = listview.page.actions
    actionButtons.children().each(function() {
        var actionButton = $(this);
        var buttonText = actionButton.text().trim();
        // console.log(buttonText)
        if (!action_name.includes(buttonText)) {
            // Remove the action button
            actionButton.remove();
        }
    })
}

function remove_assign_to(listview,action){
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

function remove_assign_to_three_dot(listview){
    var three_dot_menu = listview.page.menu
	three_dot_menu.children().each(function() {
		var rename_button = $(this);		
		var button = rename_button.text().replace(/^\s+|\s+$/gm,'').split('\n')[0];
		if (button === "Toggle Sidebar" || button === "Share URL" || button === "User Permissions") {
			rename_button.remove();
		}
	})
}

function hide_listview(listview){
    if (!["Production Inventory Allocation" ,"Administrator", "HR Manager"].includes(frappe.boot.wms.role_profile)){
		$(`[data-view="Dashboard"]`).remove();
		// $(`[data-view="Kanban"]`).remove();
        // $('.menu-btn-group').hide();
        cur_list.page.sidebar.remove();   
	}
}

function bulk_update_qa_lead(listview){
	const fields = [
		{
			"label": "User",
			"fieldname": "assigned_by",
			"fieldtype": "Link",
			"options":'User',
			"reqd": 1,
			get_query: () => {
				return {
					query: 'wms.utils.assign.get_user_tl_list',
					filters: {
						roles: "QA Lead",
					}
				}
			}
		}
	];
	
	const action = () => {
		var docnames = listview.get_checked_items(true);
		const d = new frappe.ui.Dialog({
			title: __(" Reassign to QA TL "),
			fields: fields,
			primary_action: function() {
				const data = d.get_values();
				frappe.call({
					method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.bulk_update_qa_lead',
					args: {
						doctype: listview.doctype,
						docnames:docnames,
						data:data,
						// selected_docs:selected_docs

					},
					freeze: true,
					freeze_message: __('Updating QA TL ........'),
				});
				d.hide();
        refresh_list(listview)
			},
			primary_action_label: __('Update')
			
		});
		d.show();
	}
	listview.page.add_actions_menu_item(__('Reassign to QA TL'), action, false);
}

function qa_reassignment(listview){
	const fields = [
		{
			"label": "User",
			"fieldname": "email",
			"fieldtype": "Link",
			"options":'Employee',
			"reqd": 1,
			get_query: () => {
				return {
					query: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.get_qa_list',
					filters: {
						roles: "QA"
					}
				}
			}
		}
	];
	
	const action = () => {
		var docnames = listview.get_checked_items(true);
		const d = new frappe.ui.Dialog({
			title: __(" Reassign to QA"),
			fields: fields,
			primary_action: function() {
				const data = d.get_values();
				frappe.call({
					method: 'wms.wms.doctype.medical_coder_flow.medical_coder_flow.bulk_update_qa',
					args: {
						doctype: listview.doctype,
						docnames:docnames,
						data:data
						// selected_docs:selected_docs

					},
					freeze: true,
					freeze_message: __('Updating QA ........'),
				});
				d.hide();
        refresh_list(listview)
			},
			primary_action_label: __('Update')
			
		});
		d.show();
	}
	listview.page.add_actions_menu_item(__('Reassign to QA'), action, false);
}

function refresh_list(listview){
	setTimeout(()=>{
		if (cur_dialog){
			cur_dialog.hide()
		}
	listview.refresh()
	},3000)
}

//Function to hide the columns in the list view('status')
function show_hide_columns(listview) {
    delete listview.columns[2];
    listview.render_header(listview.columns);
}

function hide_mr_number(listview){
  if(["QA Lead"].includes(frappe.boot.wms.role_profile)){
    listview.data.map((item)=>{
        if(["Pending Quality","Picked for Audit"].includes(item.chart_status)){
            $(`.ellipsis[title="MR Number: ${item.mr_number}"]`).hide()
        } else if(item.chart_status != "Pending Quality" || item.chart_status != "Picked for Audit"){
                $(`.ellipsis[title=${item.mr_number}]`).show()
            }
        })
    }
    if(["QA Inventory Allocation"].includes(frappe.boot.wms.role_profile)){
        listview.data.map((item)=>{
            if(["Production Completed","Picked for Audit"].includes(item.chart_status)){
                $(`.ellipsis[title="MR Number: ${item.mr_number}"]`).hide()
            } else if(item.chart_status != "Production Completed" || item.chart_status != "Picked for Audit"){
                    $(`.ellipsis[title=${item.mr_number}]`).show()
                }
            })
        }
}

//Function to hide mr_number values to QA Lead when in status(Picked for Audit, Pending Quality)
// function hide_mr_number_for_qalead(listview) {
//     if(frappe.user_roles.includes("QA Lead") && frappe.session.user != "Administrator" && !in_list(["WMS Manager","Super User"],frappe.boot.wms.role_profile)){
//         listview.data.map((item)=>{ 
//             if(item.chart_status == "Pending Quality" || item.chart_status == "Picked for Audit"){
//                 $(`.ellipsis[title="MR Number: ${item.mr_number}"]`).hide()
//             }
//             else
//         })
//     }
// }



function add_assignment_btn(listview){
    if($(".btn-self-assignment").length == 0){
        $(`[data-page-route="List/Medical Coder Flow/List"]`).find('.custom-actions')
        .prepend(listview.page.add_button('Self Assignment',()=>{

            items = listview.get_checked_items()

            frappe.call({

                method:"wms.utils.api.validate_qa_queue",

                args:{items:items}

            })

        }).addClass('btn-self-assignment'))
    }
}

frappe.realtime.on('sync_qa',()=>{

	cur_list.refresh()

})


function button_filters(listview) {
    var home_button = $('<button>').text('Home').addClass('custom-button')
    $(`[data-page-route="List/Medical Coder Flow/List"]`).find('.container.page-body').before(home_button);
    $('.filter-x-button').click(function(){
        $('.custom-button').removeClass('highlight');
        $(home_button).addClass('highlight');
    })
    home_button.css("margin-left", "30px")
    home_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
        cur_list.filter_area.filter_list.clear_filters();
        cur_list.filter_area.filter_list.update_filter_button();
        cur_list.filter_area.filter_list.on_change();
        listview.refresh();
        }
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change();
            listview.list_sidebar.list_view.refresh();
        }
    }); 
    
    var pending_button = $('<button>').text('Work List(Pending)').addClass('custom-button');
    var completed_button = $('<button>').text('Work List(Completed)').addClass('custom-button');
    var hold_button = $('<button>').text('Hold Queue').addClass('custom-button');
    var technical_button = $('<button>').text('Technical Issue').addClass('custom-button');
    var first_appeal_button = $('<button>').text('1st Appeal').addClass('custom-button');
    var second_appeal_button = $('<button>').text('2nd Appeal').addClass('custom-button');
    
    var pending_status = ['Draft', 'In-Progress', 'Picked for Audit', 'Pending Quality', 'Error Marked By QA', 'Error Corrected by Coder', 'Error Corrected by QA', 'No Error', 'Clarification Required- Query 1', 'Clarification Required- Query 2', 'Clarification Required- Query 3', 'Send to Medical Coder - Answer 1', 'Send to Medical Coder - Answer 2', 'Send to Medical Coder - Answer 3']
    var completed_status = ['Production Completed', 'Locked']
    var first_appeal = ['Coder 1st Level Appeal', 'Coder Error Accepted  by L1 supervisor - 1st Level Appeal', 'Coder Error Rejected by L1 supervisor - 1st Level Appeal', '1st Level Appeal - Error Accepted by Coder', 'QA Error Accepted by QA TL', 'QA Error Rejected  by QA TL', 'Error Accepted by QA', 'Coder Error Accepted  by L1 supervisor-Post QA TL Feedback', 'Coder Error Rejected  by L1 supervisor-Post QA TL Feedback', 'Coder Error Accepted  by L2 supervisor - 1st Level Appeal', 'Coder Error Rejected  by L2 supervisor - 1st Level Appeal']
    var second_appeal = ['Coder 2nd Level Appeal', 'Coder Error Accepted  by L2 supervisor - 2nd Level Appeal', 'Coder Error Rejected by L2 Supervisor - 2nd Level Appeal', 'QA Error Accepted by QA Manager', 'QA Error Rejected by QA Manager', 'Coder Error Accepted by Department Head', 'Coder Error Rejected by Department Head', 'QA Appeal', 'Operations Manager Review - Coder Error Rejected  by L1 supervisor', 'Operations Manager Review - 2nd Level Appeal', 'QA Manager Review - QA Appeal', 'QA Manager Review - Coder Error Rejected  by L2 supervisor - 1st Level Appeal', 'QA Manager Review - Coder Error Rejected by L2 Supervisor - 2nd Level Appeal', 'Department Head Review - QA Error Rejected by QA Manager']

    home_button.after(second_appeal_button).after(first_appeal_button).after(technical_button).after(hold_button).after(completed_button).after(pending_button);
    $(home_button).addClass('highlight');
    pending_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", pending_status);
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        }  
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", pending_status);
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
            listview.list_sidebar.list_view.refresh()  
        }
    });
    completed_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", completed_status);
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        }  
        else {
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", completed_status);
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
        listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
        listview.list_sidebar.list_view.refresh()  
        }  
    });
    hold_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", "set");
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        } 
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", "set");
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
            listview.list_sidebar.list_view.refresh()    
        }
    });
    technical_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", "set");
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        } 
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", "set");
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
            listview.list_sidebar.list_view.refresh()   
        } 
    });
    first_appeal_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation", "Production Access"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", first_appeal);
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        } 
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", first_appeal);
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
            listview.list_sidebar.list_view.refresh()    
        }
    });
    second_appeal_button.click(function(){
        $(this).toggleClass('highlight');
        $('.custom-button').removeClass('highlight');
        $(this).addClass('highlight');
        if (frappe.user.has_role(["Medical Coder", "Production Inventory Allocation", "QA Inventory Allocation"])) {
            cur_list.filter_area.filter_list.clear_filters();
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", second_appeal);
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            cur_list.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            cur_list.filter_area.filter_list.update_filter_button();
            cur_list.filter_area.filter_list.on_change() 
            listview.refresh()  
        } 
        else {
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.clear_filters();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "chart_status", "in", second_appeal);
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "hold_reason", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.add_filter("Medical Coder Flow", "technical_issue", "is", 'not set');
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.update_filter_button();
            listview.list_sidebar.list_filter.list_view.filter_area.filter_list.on_change() 
            listview.list_sidebar.list_view.refresh()  
        }  
    });
    
}

$('<style>').text(`
    .button-container {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
    }

    .custom-button {
        background-color: #399bf8; 
        border: none;
        color: white;
        padding: 10px 20px;
        text-align: center;
        text-decoration: none;
        font-size: 16px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s ease;
        cursor: pointer;
        margin-right: -10px; 
    }

    .custom-button:last-child {
        margin-right: 0; 
    }

    .custom-button.highlight {
        background-color: #f1951f; 
    }

    .custom-button:hover {
        background-color: #0056b3; 
        transform: translateY(-1px); 
        box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
    }

    .custom-button:active {
        transform: translateY(1px);
    }

    .custom-button:focus {
        outline: none;
    }
`).appendTo('head');



