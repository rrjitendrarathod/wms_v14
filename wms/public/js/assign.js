
frappe.ui.form.AssignToDialog = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.make();
		this.set_description_from_doc();
		if(['Production TL','QA Inventory Allocation'].includes(frappe.boot.wms.role_profile) && Array.isArray(this.docname))
			this.get_assignments()
		
		
	},
	make: function() {
		let me = this;
		this.dl = me.dialog = new frappe.ui.Dialog({
			title: __('Add to ToDo'),
			fields: me.get_fields(),
			primary_action_label: __("Add"),
			primary_action: function() {
				let args = me.dialog.get_values();

				if (args && args.assign_to) {
					me.dialog.set_message("Assigning...");

					frappe.call({
						method: me.method,
						args: $.extend(args, {
							doctype: me.doctype,
							name: me.docname,
							assign_to: args.assign_to,
							bulk_assign: me.bulk_assign || false,
							re_assign: me.re_assign || true
						}),
						btn: me.dialog.get_primary_btn(),
						callback: function(r) {
							if (!r.exc) {
								if (me.callback) {
									me.callback(r);
								}
								me.dialog && me.dialog.hide();
							} else {
								me.dialog.clear_message();
							}
						},
					});
				}
			},
			
		});
		
		
	},

	set_description_from_doc: function() {
		let me = this;

		if (me.frm && me.frm.meta.title_field) {
			me.dialog.set_value("description", me.frm.doc[me.frm.meta.title_field]);
		}
	},
	get_fields: function() {
		let me = this;

		return [			
			{
				fieldtype: 'MultiSelectPills',
				fieldname: 'assign_to',
				label: __("Assign To"),
				reqd: true,
				onchange: ()=> me.validate_user(),
				get_data: function(txt) {

					if(frappe.user_roles.includes('Production Inventory Allocation') && !['Administrator'].includes(frappe.session.user )){
						var roles =["Production TL"]
						var users = me.get_user_list(roles)
						return frappe.db.get_link_options("User", txt, {'name':["in", users]});

					}
					if(frappe.user_roles.includes('Production TL') && !['Administrator'].includes(frappe.session.user )){	
						var roles = ["Production TL","Medical Coder"]
						var users = me.get_user_list(roles)
						return frappe.db.get_link_options("User", txt, {'name':["in", users]});
						
					}
					else if(frappe.user_roles.includes('QA Lead') && !['Administrator'].includes(frappe.session.user )){
						var roles = ["QA"]
						var users = me.get_user_list(roles)
						return frappe.db.get_link_options("User", txt, {'name':["in", users]});
						
					}
					else if(frappe.user_roles.includes('QA Inventory Allocation') && !['Administrator'].includes(frappe.session.user )){
						var roles = ["QA Lead"]
						var users = me.get_user_list(roles)
						return frappe.db.get_link_options("User", txt, {'name':["in", users]});
					}
					else{
						return frappe.db.get_link_options("User", txt, {user_type: "System User", enabled: 1});
					}
					
					
				}
			},
			{
				label: __("Comment"),
				fieldtype: 'Small Text',
				fieldname: 'description'
			},
			{
				fieldtype: 'Section Break'
			},
			{
				fieldtype: 'Column Break'
			},
			{
				label: __("Complete By"),
				fieldtype: 'Date',
				fieldname: 'date',
				onchange: ()=> me.validate_date(),
			},
			{
				label:__("Clear All"),
				fieldtype: 'Check',
				fieldname: 'clear_all',
				onchange:()=> me.remove_all()
			},
			{
				fieldtype: 'Column Break'
			},
			{
				label: __("Priority"),
				fieldtype: 'Select',
				fieldname: 'priority',
				options: [
					{
						value: 'Low',
						label: __('Low')
					},
					{
						value: 'Medium',
						label: __('Medium')
					},
					{
						value: 'High',
						label: __('High')
					}
					
				],
				// Pick up priority from the source document, if it exists and is available in ToDo
				default: ["Low", "Medium", "High"].includes(me.frm && me.frm.doc.priority ? me.frm.doc.priority : 'Medium')
			},
			{
				fieldtype: 'HTML',
				fieldname: 'assignment_list'
			}
		];
	},
	validate_user:function(){
		
		let me = this;
                if(me.dialog.get_value('assign_to') && me.dialog.get_value('assign_to').length>1){
					me.dialog.set_value('assign_to',null);
                    frappe.show_alert({
                        message:__('You cannot assign more than one user'),
						indicator:'orange'
						},6)
                }
				if(me.dialog.get_value('assign_to') == frappe.session.user){
					me.dialog.set_value('assign_to',null);
                    frappe.show_alert({
                        message:__('You cannot assign to Self'),
						indicator:'red'
						},6)		
				}

				
				if(me.dialog.get_value('assign_to').length){
					var users = []
					if(frappe.user_roles.includes('QA Inventory Allocation') && !['Administrator'].includes(frappe.session.user )){
						var roles =["Production TL"]
						var users = me.get_user_list(roles)
						var p = frappe.db.get_link_options("User", txt, {'name':["in", users]});

					}

					else if(frappe.user_roles.includes('Production TL') && !['Administrator'].includes(frappe.session.user )){
						var roles = ["Production TL","Medical Coder"]
						var users = me.get_user_list(roles)
						var p =  frappe.db.get_link_options("User", txt, {'name':["in", users]});

					}
					else if(frappe.user_roles.includes('QA Lead') && !['Administrator'].includes(frappe.session.user )){
						var roles = ["QA"]
						var users = me.get_user_list(roles)
						var p =  frappe.db.get_link_options("User", txt, {'name':["in", users]});
					}

						p.then(value => {
							value.forEach(function(item) {
								users.push(item.value)
							  });

							if(me.dialog.get_value('assign_to')[0] && !users.includes(me.dialog.get_value('assign_to')[0])){
								me.dialog.set_value('assign_to',null);
								me.dialog.fields_dict.assign_to.$input.val("")
								frappe.show_alert({
									message:__('You Can Not Assign Invalid User'),
									indicator:'orange'
									},6)
							}
						  }).catch(err => {
							console.log(err);
						  });
						
						
					}

				


	},
	validate_date:function(){ 
		// used to check date diff 
		if (this.dialog.get_value("date")){
			let date_diff = frappe.datetime.get_diff(this.dialog.get_value("date") ,frappe.datetime.now_date())
			if (date_diff < 0){
				this.dialog.set_value('date',null);
				frappe.show_alert({message:__('You can not select past date'),indicator:'orange'})	
				}
		}	
	},
	update_assignment(assignment,docname) {
		//const in_the_list = this.assignment_list.find(`[data-user="${assignment}"]`).length;
		
		this.assignment_list.append(this.get_assignment_row(assignment,docname));
		
	},
	get_assignment_row(assignment,docname) {
		let row = $(`
			<div class="dialog-assignment-row" data-user="${assignment}" data-name="${docname}" ">
				<span>
					${frappe.avatar(assignment)}
					${frappe.user.full_name(assignment)}
				</span>
			</div>
		`);

		if (assignment === frappe.session.user || frappe.perm.get_perm(cur_list.doctype)[0].write) {
			row.append(`
				<span class="remove-btn cursor-pointer">
					${frappe.utils.icon('close')}
				</span>
			`);
			row.find('.remove-btn').click(async () => {
				if (cur_list.doctype == "Medical Coder Flow") {
					var hold_reason = (await frappe.db.get_value("Medical Coder Flow", docname, "hold_reason")).message.hold_reason;
					if (hold_reason) {
					frappe.throw("Cannot remove assigned user as there is Hold reason for the record " + docname)
				}
				}
				this.remove_assignment(assignment,docname).then((assignments) => {
					row.remove();
					cur_list.refresh()
					this.record_list = this.record_list.filter((record)=>record.name!==docname)
					this.re_render(assignments);
				})
			});
		}
		return row;
	},
	remove_assignment(assignment,docname) {
		return frappe.xcall('frappe.desk.form.assign_to.remove', {
			doctype:cur_list.doctype,
			name:docname,
			assign_to: assignment,
		});
	},
	get_assignments(){
		let me = this;
		frappe.call({
			method:"wms.utils.assign.get_assignments",
			args:{
				dt:this.doctype,
				dn:this.docname
			},
			callback:(r)=>{
				if(r.message){
					let response= r.message
					this.record_list = response
					me.render_assignment(response)
				}
			}
		})
	},
	render_assignment(assignments){
		this.assignment_list = $(this.dl.get_field('assignment_list').wrapper);
		this.assignment_list.removeClass('frappe-control');
		this.record_list && this.record_list.length>1 ? this.dialog.set_df_property('clear_all','hidden',0):this.dialog.set_df_property('clear_all','hidden',1)
		assignments.forEach(assignment => {
			this.update_assignment(assignment['allocated_to'],assignment['name']);
		});
	},
	re_render(assignments){
		this.render_assignment(assignments)
	},
	remove_all(){
		if(this.dialog.get_value('clear_all')===1){
			frappe.call({
				method:"wms.public.py.user_data.remove_multiple",
				args:{doctype:cur_list.doctype,data:this.record_list},
				callback:(r)=>{ 
					if (r.message){
						for(let i in r.message)
							$(`.dialog-assignment-row[data-name="${r.message[i]}"]`).remove()
						cur_list.refresh()
						setTimeout($('.list-row-checkbox').prop('checked',false),500)
					}
				}
			});
		}

			
	},
	get_user_list(roles){
		var users = ""
		frappe.call({
			method: "wms.utils.assign.get_user_list",
			args: {
				roles : roles
			},
			async: false,
			callback: function(r) {
				users = r.message
			}
		});
		return users

		
	}
});


